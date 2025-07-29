import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { NotificationType } from '@/types/notification'

// Server-side Supabase client with service role key
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for admin client')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export interface CreateNotificationParams {
  user_id: string
  title: string
  message: string
  type: NotificationType
  link_url?: string
  entity_type?: string
  entity_id?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export class NotificationService {
  private static getAdmin() {
    return getSupabaseAdmin()
  }

  /**
   * Create a notification for a specific user
   */
  static async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      // Use the database function that checks notification settings
      const { error } = await this.getAdmin().rpc('create_notification', {
        p_user_id: params.user_id,
        p_title: params.title,
        p_message: params.message,
        p_type: params.type,
        p_link_url: params.link_url || null,
        p_entity_type: params.entity_type || null,
        p_entity_id: params.entity_id || null,
        p_priority: params.priority || 'normal'
      })

      if (error) {
        console.error('Error creating notification:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'user_id'>
  ): Promise<void> {
    try {
      const promises = userIds.map(userId =>
        this.createNotification({ ...params, user_id: userId })
      )
      await Promise.all(promises)
    } catch (error) {
      console.error('Failed to create bulk notifications:', error)
      throw error
    }
  }

  /**
   * Get all admin users for system notifications
   */
  static async getAdminUsers(): Promise<string[]> {
    try {
      const { data, error } = await this.getAdmin()
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)

      if (error) throw error
      return data?.map(user => user.id) || []
    } catch (error) {
      console.error('Failed to get admin users:', error)
      return []
    }
  }

  // Quote-related notifications
  static async notifyQuoteCreated(quoteId: string, createdBy: string): Promise<void> {
    try {
      const { data: quote, error } = await this.getAdmin()
        .from('quotes')
        .select(`
          quote_number,
          project_title,
          customer_name_snapshot,
          total_amount
        `)
        .eq('id', quoteId)
        .single()

      if (error || !quote) return

      const adminUsers = await this.getAdminUsers()
      const targetUsers = adminUsers.filter(id => id !== createdBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '새 견적서가 생성되었습니다',
          message: `${quote.customer_name_snapshot}에 대한 견적서 "${quote.project_title}" (${quote.quote_number})가 생성되었습니다.`,
          type: 'quote_created',
          link_url: `/quotes/${quoteId}`,
          entity_type: 'quote',
          entity_id: quoteId,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Failed to notify quote created:', error)
    }
  }

  static async notifyQuoteStatusChanged(
    quoteId: string,
    newStatus: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const { data: quote, error } = await this.getAdmin()
        .from('quotes')
        .select(`
          quote_number,
          project_title,
          customer_name_snapshot,
          created_by
        `)
        .eq('id', quoteId)
        .single()

      if (error || !quote) return

      const statusLabels: Record<string, string> = {
        'sent': '발송됨',
        'accepted': '승인됨',
        'rejected': '거절됨',
        'expired': '만료됨',
        'draft': '초안'
      }

      let notificationType: NotificationType = 'general'
      let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'

      if (newStatus === 'accepted') {
        notificationType = 'quote_approved'
        priority = 'high'
      } else if (newStatus === 'rejected') {
        notificationType = 'quote_rejected'
        priority = 'high'
      }

      // Notify quote creator and admins
      const adminUsers = await this.getAdminUsers()
      const targetUsers = Array.from(new Set([
        quote.created_by,
        ...adminUsers
      ])).filter(id => id && id !== updatedBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: `견적서 상태가 변경되었습니다`,
          message: `견적서 "${quote.project_title}" (${quote.quote_number})가 ${statusLabels[newStatus] || newStatus}로 변경되었습니다.`,
          type: notificationType,
          link_url: `/quotes/${quoteId}`,
          entity_type: 'quote',
          entity_id: quoteId,
          priority
        })
      }
    } catch (error) {
      console.error('Failed to notify quote status changed:', error)
    }
  }

  static async notifyQuoteExpiring(): Promise<void> {
    try {
      // Get quotes expiring in 3 days
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const { data: expiringQuotes, error } = await this.getAdmin()
        .from('quotes')
        .select(`
          id,
          quote_number,
          project_title,
          customer_name_snapshot,
          created_by
        `)
        .eq('status', 'sent')
        .lte('valid_until', threeDaysFromNow.toISOString().split('T')[0])

      if (error || !expiringQuotes) return

      for (const quote of expiringQuotes) {
        const adminUsers = await this.getAdminUsers()
        const targetUsers = Array.from(new Set([
          quote.created_by,
          ...adminUsers
        ])).filter(id => id)

        if (targetUsers.length > 0) {
          await this.createBulkNotifications(targetUsers, {
            title: '견적서 만료 임박',
            message: `견적서 "${quote.project_title}" (${quote.quote_number})의 유효기간이 곧 만료됩니다.`,
            type: 'quote_expiring',
            link_url: `/quotes/${quote.id}`,
            entity_type: 'quote',
            entity_id: quote.id,
            priority: 'high'
          })
        }
      }
    } catch (error) {
      console.error('Failed to notify expiring quotes:', error)
    }
  }

  // Project-related notifications
  static async notifyProjectCreated(projectId: string, createdBy: string): Promise<void> {
    try {
      const { data: project, error } = await this.getAdmin()
        .from('projects')
        .select(`
          name,
          total_revenue,
          quote_id,
          quotes(quote_number, customer_name_snapshot)
        `)
        .eq('id', projectId)
        .single()

      if (error || !project) return

      const adminUsers = await this.getAdminUsers()
      const targetUsers = adminUsers.filter(id => id !== createdBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '새 프로젝트가 생성되었습니다',
          message: `프로젝트 "${project.name}"이 생성되었습니다. (견적서: ${project.quotes?.quote_number})`,
          type: 'project_created',
          link_url: `/projects/${projectId}`,
          entity_type: 'project',
          entity_id: projectId,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Failed to notify project created:', error)
    }
  }

  static async notifyProjectStatusChanged(
    projectId: string,
    newStatus: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const { data: project, error } = await this.getAdmin()
        .from('projects')
        .select(`
          name,
          created_by
        `)
        .eq('id', projectId)
        .single()

      if (error || !project) return

      const statusLabels: Record<string, string> = {
        'active': '진행 중',
        'completed': '완료',
        'on_hold': '보류',
        'canceled': '취소'
      }

      const adminUsers = await this.getAdminUsers()
      const targetUsers = Array.from(new Set([
        project.created_by,
        ...adminUsers
      ])).filter(id => id && id !== updatedBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '프로젝트 상태가 변경되었습니다',
          message: `프로젝트 "${project.name}"이 ${statusLabels[newStatus] || newStatus}로 변경되었습니다.`,
          type: 'project_status_changed',
          link_url: `/projects/${projectId}`,
          entity_type: 'project',
          entity_id: projectId,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Failed to notify project status changed:', error)
    }
  }

  static async notifyProjectDeadlineApproaching(): Promise<void> {
    try {
      // Get projects with end_date in next 3 days
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const { data: projects, error } = await this.getAdmin()
        .from('projects')
        .select(`
          id,
          name,
          end_date,
          created_by
        `)
        .eq('status', 'active')
        .lte('end_date', threeDaysFromNow.toISOString().split('T')[0])

      if (error || !projects) return

      for (const project of projects) {
        const adminUsers = await this.getAdminUsers()
        const targetUsers = Array.from(new Set([
          project.created_by,
          ...adminUsers
        ])).filter(id => id)

        if (targetUsers.length > 0) {
          await this.createBulkNotifications(targetUsers, {
            title: '프로젝트 마감일 임박',
            message: `프로젝트 "${project.name}"의 마감일이 곧 다가옵니다.`,
            type: 'project_deadline_approaching',
            link_url: `/projects/${project.id}`,
            entity_type: 'project',
            entity_id: project.id,
            priority: 'high'
          })
        }
      }
    } catch (error) {
      console.error('Failed to notify project deadline approaching:', error)
    }
  }

  // Settlement-related notifications
  static async notifySettlementDue(): Promise<void> {
    try {
      // Get transactions due in next 3 days
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const { data: transactions, error } = await this.getAdmin()
        .from('transactions')
        .select(`
          id,
          partner_name,
          item_name,
          amount,
          due_date,
          created_by,
          project_id
        `)
        .in('status', ['pending', 'processing'])
        .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])

      if (error || !transactions) return

      const adminUsers = await this.getAdminUsers()

      for (const transaction of transactions) {
        const targetUsers = Array.from(new Set([
          transaction.created_by,
          ...adminUsers
        ])).filter(id => id)

        if (targetUsers.length > 0) {
          await this.createBulkNotifications(targetUsers, {
            title: '정산일 임박',
            message: `${transaction.partner_name}의 "${transaction.item_name}" 정산일이 곧 다가옵니다. (금액: ${transaction.amount.toLocaleString()}원)`,
            type: 'settlement_due',
            link_url: `/revenue?transaction=${transaction.id}`,
            entity_type: 'transaction',
            entity_id: transaction.id,
            priority: 'high'
          })
        }
      }
    } catch (error) {
      console.error('Failed to notify settlement due:', error)
    }
  }

  static async notifySettlementOverdue(): Promise<void> {
    try {
      // Get overdue transactions
      const today = new Date().toISOString().split('T')[0]

      const { data: transactions, error } = await this.getAdmin()
        .from('transactions')
        .select(`
          id,
          partner_name,
          item_name,
          amount,
          due_date,
          created_by
        `)
        .in('status', ['pending', 'processing'])
        .lt('due_date', today)

      if (error || !transactions) return

      const adminUsers = await this.getAdminUsers()

      for (const transaction of transactions) {
        const targetUsers = Array.from(new Set([
          transaction.created_by,
          ...adminUsers
        ])).filter(id => id)

        if (targetUsers.length > 0) {
          await this.createBulkNotifications(targetUsers, {
            title: '정산 연체',
            message: `${transaction.partner_name}의 "${transaction.item_name}" 정산이 연체되었습니다. (금액: ${transaction.amount.toLocaleString()}원)`,
            type: 'settlement_overdue',
            link_url: `/revenue?transaction=${transaction.id}`,
            entity_type: 'transaction',
            entity_id: transaction.id,
            priority: 'urgent'
          })
        }
      }
    } catch (error) {
      console.error('Failed to notify settlement overdue:', error)
    }
  }

  static async notifySettlementCompleted(transactionId: string, updatedBy: string): Promise<void> {
    try {
      const { data: transaction, error } = await this.getAdmin()
        .from('transactions')
        .select(`
          partner_name,
          item_name,
          amount,
          created_by
        `)
        .eq('id', transactionId)
        .single()

      if (error || !transaction) return

      const adminUsers = await this.getAdminUsers()
      const targetUsers = Array.from(new Set([
        transaction.created_by,
        ...adminUsers
      ])).filter(id => id && id !== updatedBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '정산 완료',
          message: `${transaction.partner_name}의 "${transaction.item_name}" 정산이 완료되었습니다. (금액: ${transaction.amount.toLocaleString()}원)`,
          type: 'settlement_completed',
          link_url: `/revenue?transaction=${transactionId}`,
          entity_type: 'transaction',
          entity_id: transactionId,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Failed to notify settlement completed:', error)
    }
  }

  // System-related notifications
  static async notifyUserJoined(userId: string): Promise<void> {
    try {
      const { data: user, error } = await this.getAdmin()
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (error || !user) return

      const adminUsers = await this.getAdminUsers()
      const targetUsers = adminUsers.filter(id => id !== userId)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '새 사용자가 가입했습니다',
          message: `${user.full_name || user.email}님이 시스템에 가입했습니다.`,
          type: 'system_user_joined',
          link_url: `/settings/users`,
          entity_type: 'user',
          entity_id: userId,
          priority: 'low'
        })
      }
    } catch (error) {
      console.error('Failed to notify user joined:', error)
    }
  }

  static async notifyPermissionChanged(userId: string, newRole: string, changedBy: string): Promise<void> {
    try {
      const { data: user, error } = await this.getAdmin()
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (error || !user) return

      const roleLabels: Record<string, string> = {
        'admin': '관리자',
        'member': '사용자'
      }

      // Notify the user whose permission changed and other admins
      const adminUsers = await this.getAdminUsers()
      const targetUsers = Array.from(new Set([
        userId,
        ...adminUsers
      ])).filter(id => id && id !== changedBy)

      if (targetUsers.length > 0) {
        await this.createBulkNotifications(targetUsers, {
          title: '사용자 권한이 변경되었습니다',
          message: `${user.full_name || user.email}님의 권한이 ${roleLabels[newRole] || newRole}로 변경되었습니다.`,
          type: 'system_permission_changed',
          link_url: `/settings/users`,
          entity_type: 'user',
          entity_id: userId,
          priority: 'normal'
        })
      }
    } catch (error) {
      console.error('Failed to notify permission changed:', error)
    }
  }
}