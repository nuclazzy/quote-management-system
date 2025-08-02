/**
 * 데이터베이스 트랜잭션 유틸리티
 * Supabase를 사용한 트랜잭션 관리
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createApiError } from '@/lib/api/client';

interface TransactionOptions {
  timeout?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  retries?: number;
}

interface TransactionContext {
  supabase: SupabaseClient;
  isTransaction: boolean;
}

/**
 * 트랜잭션을 실행하는 함수
 */
export async function withTransaction<T>(
  supabase: SupabaseClient,
  callback: (ctx: TransactionContext) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { timeout = 30000, retries = 3 } = options;

  let attempt = 0;
  let lastError: Error;

  while (attempt <= retries) {
    try {
      // RPC를 사용한 트랜잭션 실행
      const { data, error } = await supabase.rpc('execute_transaction', {
        timeout_ms: timeout,
      });

      if (error) {
        throw createApiError(
          `트랜잭션 실행 실패: ${error.message}`,
          500,
          'TRANSACTION_ERROR',
          error
        );
      }

      // 트랜잭션 컨텍스트로 콜백 실행
      const result = await callback({
        supabase,
        isTransaction: true,
      });

      return result;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // 트랜잭션 충돌이나 일시적 오류인 경우에만 재시도
      if (
        attempt <= retries &&
        (lastError.message.includes('serialization_failure') ||
         lastError.message.includes('deadlock_detected') ||
         lastError.message.includes('could not serialize'))
      ) {
        console.warn(`트랜잭션 재시도 (${attempt}/${retries + 1}): ${lastError.message}`);
        
        // 지수 백오프로 대기
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError!;
}

/**
 * 견적서 저장 트랜잭션
 */
export async function saveQuoteWithTransaction(
  supabase: SupabaseClient,
  quoteData: {
    quote: any;
    groups: any[];
    items: any[];
    detailItems: any[];
  }
): Promise<{ quoteId: string }> {
  return withTransaction(supabase, async (ctx) => {
    try {
      // 1. 견적서 저장
      const { data: quote, error: quoteError } = await ctx.supabase
        .from('quotes')
        .insert(quoteData.quote)
        .select('id')
        .single();

      if (quoteError || !quote) {
        throw createApiError(
          `견적서 저장 실패: ${quoteError?.message || '알 수 없는 오류'}`,
          500,
          'QUOTE_SAVE_ERROR',
          quoteError
        );
      }

      const quoteId = quote.id;

      // 2. 그룹 저장
      if (quoteData.groups.length > 0) {
        const groupsWithQuoteId = quoteData.groups.map(group => ({
          ...group,
          quote_id: quoteId,
        }));

        const { error: groupsError } = await ctx.supabase
          .from('quote_groups')
          .insert(groupsWithQuoteId);

        if (groupsError) {
          throw createApiError(
            `그룹 저장 실패: ${groupsError.message}`,
            500,
            'GROUPS_SAVE_ERROR',
            groupsError
          );
        }
      }

      // 3. 항목 저장
      if (quoteData.items.length > 0) {
        const itemsWithQuoteId = quoteData.items.map(item => ({
          ...item,
          quote_id: quoteId,
        }));

        const { error: itemsError } = await ctx.supabase
          .from('quote_items')
          .insert(itemsWithQuoteId);

        if (itemsError) {
          throw createApiError(
            `항목 저장 실패: ${itemsError.message}`,
            500,
            'ITEMS_SAVE_ERROR',
            itemsError
          );
        }
      }

      // 4. 세부 항목 저장
      if (quoteData.detailItems.length > 0) {
        const detailItemsWithQuoteId = quoteData.detailItems.map(detailItem => ({
          ...detailItem,
          quote_id: quoteId,
        }));

        const { error: detailItemsError } = await ctx.supabase
          .from('quote_detail_items')
          .insert(detailItemsWithQuoteId);

        if (detailItemsError) {
          throw createApiError(
            `세부 항목 저장 실패: ${detailItemsError.message}`,
            500,
            'DETAIL_ITEMS_SAVE_ERROR',
            detailItemsError
          );
        }
      }

      return { quoteId };
    } catch (error) {
      console.error('견적서 트랜잭션 저장 중 오류:', error);
      throw error;
    }
  });
}

/**
 * 견적서 업데이트 트랜잭션
 */
export async function updateQuoteWithTransaction(
  supabase: SupabaseClient,
  quoteId: string,
  updateData: {
    quote?: any;
    groups?: any[];
    items?: any[];
    detailItems?: any[];
  }
): Promise<void> {
  return withTransaction(supabase, async (ctx) => {
    try {
      // 1. 견적서 업데이트
      if (updateData.quote) {
        const { error: quoteError } = await ctx.supabase
          .from('quotes')
          .update({
            ...updateData.quote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', quoteId);

        if (quoteError) {
          throw createApiError(
            `견적서 업데이트 실패: ${quoteError.message}`,
            500,
            'QUOTE_UPDATE_ERROR',
            quoteError
          );
        }
      }

      // 2. 기존 데이터 삭제 및 새 데이터 삽입 (간단한 전략)
      if (updateData.groups) {
        // 기존 그룹 삭제
        const { error: deleteGroupsError } = await ctx.supabase
          .from('quote_groups')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteGroupsError) {
          throw createApiError(
            `기존 그룹 삭제 실패: ${deleteGroupsError.message}`,
            500,
            'DELETE_GROUPS_ERROR',
            deleteGroupsError
          );
        }

        // 새 그룹 삽입
        if (updateData.groups.length > 0) {
          const groupsWithQuoteId = updateData.groups.map(group => ({
            ...group,
            quote_id: quoteId,
          }));

          const { error: insertGroupsError } = await ctx.supabase
            .from('quote_groups')
            .insert(groupsWithQuoteId);

          if (insertGroupsError) {
            throw createApiError(
              `새 그룹 삽입 실패: ${insertGroupsError.message}`,
              500,
              'INSERT_GROUPS_ERROR',
              insertGroupsError
            );
          }
        }
      }

      // 3. 항목 업데이트
      if (updateData.items) {
        const { error: deleteItemsError } = await ctx.supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteItemsError) {
          throw createApiError(
            `기존 항목 삭제 실패: ${deleteItemsError.message}`,
            500,
            'DELETE_ITEMS_ERROR',
            deleteItemsError
          );
        }

        if (updateData.items.length > 0) {
          const itemsWithQuoteId = updateData.items.map(item => ({
            ...item,
            quote_id: quoteId,
          }));

          const { error: insertItemsError } = await ctx.supabase
            .from('quote_items')
            .insert(itemsWithQuoteId);

          if (insertItemsError) {
            throw createApiError(
              `새 항목 삽입 실패: ${insertItemsError.message}`,
              500,
              'INSERT_ITEMS_ERROR',
              insertItemsError
            );
          }
        }
      }

      // 4. 세부 항목 업데이트
      if (updateData.detailItems) {
        const { error: deleteDetailItemsError } = await ctx.supabase
          .from('quote_detail_items')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteDetailItemsError) {
          throw createApiError(
            `기존 세부 항목 삭제 실패: ${deleteDetailItemsError.message}`,
            500,
            'DELETE_DETAIL_ITEMS_ERROR',
            deleteDetailItemsError
          );
        }

        if (updateData.detailItems.length > 0) {
          const detailItemsWithQuoteId = updateData.detailItems.map(detailItem => ({
            ...detailItem,
            quote_id: quoteId,
          }));

          const { error: insertDetailItemsError } = await ctx.supabase
            .from('quote_detail_items')
            .insert(detailItemsWithQuoteId);

          if (insertDetailItemsError) {
            throw createApiError(
              `새 세부 항목 삽입 실패: ${insertDetailItemsError.message}`,
              500,
              'INSERT_DETAIL_ITEMS_ERROR',
              insertDetailItemsError
            );
          }
        }
      }
    } catch (error) {
      console.error('견적서 트랜잭션 업데이트 중 오류:', error);
      throw error;
    }
  });
}

/**
 * 견적서 삭제 트랜잭션
 */
export async function deleteQuoteWithTransaction(
  supabase: SupabaseClient,
  quoteId: string
): Promise<void> {
  return withTransaction(supabase, async (ctx) => {
    try {
      // 1. 세부 항목 삭제
      const { error: detailItemsError } = await ctx.supabase
        .from('quote_detail_items')
        .delete()
        .eq('quote_id', quoteId);

      if (detailItemsError) {
        throw createApiError(
          `세부 항목 삭제 실패: ${detailItemsError.message}`,
          500,
          'DELETE_DETAIL_ITEMS_ERROR',
          detailItemsError
        );
      }

      // 2. 항목 삭제
      const { error: itemsError } = await ctx.supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', quoteId);

      if (itemsError) {
        throw createApiError(
          `항목 삭제 실패: ${itemsError.message}`,
          500,
          'DELETE_ITEMS_ERROR',
          itemsError
        );
      }

      // 3. 그룹 삭제
      const { error: groupsError } = await ctx.supabase
        .from('quote_groups')
        .delete()
        .eq('quote_id', quoteId);

      if (groupsError) {
        throw createApiError(
          `그룹 삭제 실패: ${groupsError.message}`,
          500,
          'DELETE_GROUPS_ERROR',
          groupsError
        );
      }

      // 4. 견적서 삭제
      const { error: quoteError } = await ctx.supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (quoteError) {
        throw createApiError(
          `견적서 삭제 실패: ${quoteError.message}`,
          500,
          'DELETE_QUOTE_ERROR',
          quoteError
        );
      }
    } catch (error) {
      console.error('견적서 트랜잭션 삭제 중 오류:', error);
      throw error;
    }
  });
}