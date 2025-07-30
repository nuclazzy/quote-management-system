import { createBrowserClient } from '@/lib/supabase/client';

export interface AutoProjectConversionOptions {
  start_date?: string;
  end_date?: string;
  auto_settlement_schedule?: boolean;
  settlement_periods?: number; // 정산 회차 (기본: 1회)
}

export class ProjectAutomationService {
  private supabase = createBrowserClient();

  /**
   * 견적서가 승인되었을 때 자동으로 프로젝트로 전환
   */
  async autoConvertQuoteToProject(
    quoteId: string,
    options: AutoProjectConversionOptions = {}
  ) {
    try {
      // 견적서 정보 조회
      const { data: quote, error: quoteError } = await this.supabase
        .from('quotes')
        .select(
          `
          *,
          customers!inner(id, name),
          quote_groups(
            id,
            name,
            include_in_fee,
            quote_items(
              id,
              name,
              include_in_fee,
              quote_details(
                id,
                name,
                quantity,
                days,
                unit_price,
                cost_price,
                is_service,
                supplier_id,
                supplier_name_snapshot
              )
            )
          )
        `
        )
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        throw new Error('견적서를 찾을 수 없습니다.');
      }

      // 견적서 상태 확인
      if (quote.status !== 'accepted') {
        throw new Error('승인된 견적서만 프로젝트로 전환할 수 있습니다.');
      }

      // 이미 프로젝트로 전환되었는지 확인
      const { data: existingProject } = await this.supabase
        .from('projects')
        .select('id')
        .eq('quote_id', quoteId)
        .single();

      if (existingProject) {
        throw new Error('이미 프로젝트로 전환된 견적서입니다.');
      }

      // 매출과 원가 계산
      const { totalRevenue, totalCost } =
        this.calculateProjectFinancials(quote);

      // 프로젝트 생성
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .insert({
          quote_id: quoteId,
          name: quote.project_title,
          total_revenue: totalRevenue,
          total_cost: totalCost,
          status: 'active',
          start_date: options.start_date,
          end_date: options.end_date,
        })
        .select()
        .single();

      if (projectError) {
        throw new Error('프로젝트 생성에 실패했습니다.');
      }

      // 정산 스케줄 자동 생성
      if (options.auto_settlement_schedule) {
        await this.createAutoSettlementSchedule(
          project.id,
          totalRevenue,
          quote.customers.name,
          quote.project_title,
          options
        );
      }

      // 비용 항목들을 거래로 생성
      await this.createExpenseTransactions(project.id, quote);

      // 알림 생성
      await this.createProjectNotification(project.id, quote.project_title);

      return project;
    } catch (error) {
      console.error('Auto project conversion error:', error);
      throw error;
    }
  }

  /**
   * 프로젝트 완료 시 자동 매출 계산 및 정산 완료 처리
   */
  async autoCompleteProjectSettlement(projectId: string) {
    try {
      // 프로젝트 정보 조회
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select(
          `
          *,
          transactions(*)
        `
        )
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      // 실제 수입과 지출 계산
      const actualIncome =
        project.transactions
          ?.filter((t: any) => t.type === 'income' && t.status === 'completed')
          .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      const actualExpense =
        project.transactions
          ?.filter((t: any) => t.type === 'expense' && t.status === 'completed')
          .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

      // 기타 경비 조회
      const { data: expenses } = await this.supabase
        .from('project_expenses')
        .select('amount')
        .eq('project_id', projectId);

      const totalExpenses =
        expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
      const finalExpense = actualExpense + totalExpenses;

      // 최종 수익 계산
      const finalProfit = actualIncome - finalExpense;
      const profitMargin =
        actualIncome > 0 ? (finalProfit / actualIncome) * 100 : 0;

      // 미완료 거래들을 완료로 표시할지 확인
      const pendingTransactions =
        project.transactions?.filter((t: any) => t.status !== 'completed') ||
        [];

      if (pendingTransactions.length > 0) {
        // 사용자 확인 없이 자동으로 완료 처리하지 않음
        console.warn(
          `프로젝트 ${projectId}에 미완료 거래가 ${pendingTransactions.length}개 있습니다.`
        );
      }

      // 프로젝트 완료 알림
      await this.supabase.from('notifications').insert({
        user_id: project.created_by,
        message: `프로젝트 "${project.name}"이 완료되었습니다. 최종 수익: ${finalProfit.toLocaleString()}원 (수익률: ${profitMargin.toFixed(1)}%)`,
        link_url: `/projects/${projectId}`,
        notification_type: 'general',
      });

      return {
        finalProfit,
        profitMargin,
        actualIncome,
        finalExpense,
        pendingTransactions: pendingTransactions.length,
      };
    } catch (error) {
      console.error('Auto project completion error:', error);
      throw error;
    }
  }

  /**
   * 정산 마감일 알림 시스템
   */
  async checkAndCreateDueDateNotifications() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // 내일 마감인 거래들
      const { data: dueTomorrow } = await this.supabase
        .from('transactions')
        .select(
          `
          *,
          projects!inner(name, created_by)
        `
        )
        .eq('due_date', tomorrowStr)
        .neq('status', 'completed');

      // 다음 주 마감인 거래들
      const { data: dueNextWeek } = await this.supabase
        .from('transactions')
        .select(
          `
          *,
          projects!inner(name, created_by)
        `
        )
        .eq('due_date', nextWeekStr)
        .neq('status', 'completed');

      // 내일 마감 알림
      if (dueTomorrow && dueTomorrow.length > 0) {
        for (const transaction of dueTomorrow) {
          await this.supabase.from('notifications').insert({
            user_id: transaction.projects.created_by,
            message: `내일(${tomorrowStr}) 마감인 정산이 있습니다: ${transaction.item_name} (${transaction.amount.toLocaleString()}원)`,
            link_url: `/projects/${transaction.project_id}`,
            notification_type: 'payment_due',
          });
        }
      }

      // 다음 주 마감 알림
      if (dueNextWeek && dueNextWeek.length > 0) {
        for (const transaction of dueNextWeek) {
          await this.supabase.from('notifications').insert({
            user_id: transaction.projects.created_by,
            message: `다음 주(${nextWeekStr}) 마감인 정산이 있습니다: ${transaction.item_name} (${transaction.amount.toLocaleString()}원)`,
            link_url: `/projects/${transaction.project_id}`,
            notification_type: 'payment_due',
          });
        }
      }

      return {
        dueTomorrow: dueTomorrow?.length || 0,
        dueNextWeek: dueNextWeek?.length || 0,
      };
    } catch (error) {
      console.error('Due date notification error:', error);
      throw error;
    }
  }

  /**
   * 연체된 거래 확인 및 알림
   */
  async checkOverdueTransactions() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: overdueTransactions } = await this.supabase
        .from('transactions')
        .select(
          `
          *,
          projects!inner(name, created_by)
        `
        )
        .lt('due_date', today)
        .neq('status', 'completed');

      if (overdueTransactions && overdueTransactions.length > 0) {
        for (const transaction of overdueTransactions) {
          const daysPastDue = Math.floor(
            (new Date().getTime() - new Date(transaction.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          await this.supabase.from('notifications').insert({
            user_id: transaction.projects.created_by,
            message: `연체된 정산이 있습니다 (${daysPastDue}일 경과): ${transaction.item_name} (${transaction.amount.toLocaleString()}원)`,
            link_url: `/projects/${transaction.project_id}`,
            notification_type: 'payment_overdue',
          });
        }
      }

      return overdueTransactions?.length || 0;
    } catch (error) {
      console.error('Overdue transaction check error:', error);
      throw error;
    }
  }

  private calculateProjectFinancials(quote: any) {
    let totalRevenue = 0;
    let totalCost = 0;

    quote.quote_groups?.forEach((group: any) => {
      group.quote_items?.forEach((item: any) => {
        item.quote_details?.forEach((detail: any) => {
          const itemTotal = detail.quantity * detail.days * detail.unit_price;
          const itemCost = detail.quantity * detail.days * detail.cost_price;

          if (group.include_in_fee && item.include_in_fee) {
            totalRevenue += itemTotal;
          }
          totalCost += itemCost;
        });
      });
    });

    // 수수료 적용
    const feeApplicableAmount = totalRevenue;
    const agencyFee = feeApplicableAmount * (quote.agency_fee_rate / 100);
    totalRevenue = feeApplicableAmount - agencyFee;

    // 할인 적용
    totalRevenue -= quote.discount_amount || 0;

    return { totalRevenue, totalCost };
  }

  private async createAutoSettlementSchedule(
    projectId: string,
    totalRevenue: number,
    customerName: string,
    projectTitle: string,
    options: AutoProjectConversionOptions
  ) {
    const periods = options.settlement_periods || 1;
    const amountPerPeriod = totalRevenue / periods;

    for (let i = 0; i < periods; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + (i + 1));

      await this.supabase.from('transactions').insert({
        project_id: projectId,
        type: 'income',
        partner_name: customerName,
        item_name: `${projectTitle} - ${periods > 1 ? `${i + 1}차 ` : ''}정산`,
        amount: amountPerPeriod,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        tax_invoice_status: 'not_issued',
      });
    }
  }

  private async createExpenseTransactions(projectId: string, quote: any) {
    const expenseTransactions = [];

    quote.quote_groups?.forEach((group: any) => {
      group.quote_items?.forEach((item: any) => {
        item.quote_details?.forEach((detail: any) => {
          if (!detail.is_service && detail.cost_price > 0) {
            const totalCostForItem =
              detail.quantity * detail.days * detail.cost_price;
            expenseTransactions.push({
              project_id: projectId,
              type: 'expense',
              partner_name: detail.supplier_name_snapshot || '미정',
              item_name: detail.name,
              amount: totalCostForItem,
              status: 'pending',
              tax_invoice_status: 'not_issued',
            });
          }
        });
      });
    });

    if (expenseTransactions.length > 0) {
      await this.supabase.from('transactions').insert(expenseTransactions);
    }
  }

  private async createProjectNotification(
    projectId: string,
    projectTitle: string
  ) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (user) {
      await this.supabase.from('notifications').insert({
        user_id: user.id,
        message: `새 프로젝트가 생성되었습니다: ${projectTitle}`,
        link_url: `/projects/${projectId}`,
        notification_type: 'project_created',
      });
    }
  }
}

export const projectAutomationService = new ProjectAutomationService();
