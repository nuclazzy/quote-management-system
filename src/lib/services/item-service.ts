import { createBrowserClient } from '../supabase/client';

const supabase = createBrowserClient();

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  sku: string;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  item_type: 'product' | 'service';
  barcode?: string;
  is_active: boolean;
  is_favorite?: boolean;
  usage_count?: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  user_id: string;
  category?: ItemCategory;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parent_category_id?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  parent_category_id?: string;
  is_active?: boolean;
}

export interface CreateItemData {
  name: string;
  description?: string;
  category_id: string;
  sku: string;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  item_type: 'product' | 'service';
  barcode?: string;
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  item_type?: 'product' | 'service';
  barcode?: string;
  is_active?: boolean;
}

export interface ItemPriceHistory {
  id: string;
  item_id: string;
  old_price: number;
  new_price: number;
  changed_by?: string;
  change_reason?: string;
  changed_at: string;
}

export interface ItemUsageStats {
  id: string;
  name: string;
  sku: string;
  quote_count: number;
  unique_quotes: number;
  total_quantity_used: number;
  avg_selling_price: number;
  last_used_at?: string;
}

export class ItemService {
  /**
   * 카테고리 목록 조회
   */
  static async getCategories(): Promise<ItemCategory[]> {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Categories fetch error:', error);
      throw new Error(`카테고리 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 카테고리 생성
   */
  static async createCategory(
    categoryData: CreateCategoryData
  ): Promise<ItemCategory> {
    const { data, error } = await supabase
      .from('item_categories')
      .insert({
        ...categoryData,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      throw new Error(`카테고리 생성 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 카테고리 수정
   */
  static async updateCategory(
    id: string,
    updates: UpdateCategoryData
  ): Promise<ItemCategory> {
    const { data, error } = await supabase
      .from('item_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Category update error:', error);
      throw new Error(`카테고리 수정 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 카테고리 삭제 (해당 카테고리에 품목이 있는지 확인)
   */
  static async deleteCategory(id: string): Promise<void> {
    // 먼저 해당 카테고리에 품목이 있는지 확인
    const { count, error: countError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);

    if (countError) {
      console.error('Category items count error:', countError);
      throw new Error(`카테고리 품목 확인 실패: ${countError.message}`);
    }

    if (count && count > 0) {
      throw new Error('해당 카테고리에 품목이 존재하여 삭제할 수 없습니다.');
    }

    const { error } = await supabase
      .from('item_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Category deletion error:', error);
      throw new Error(`카테고리 삭제 실패: ${error.message}`);
    }
  }

  /**
   * 품목 목록 조회 (카테고리 정보 포함)
   */
  static async getItems(includeFavorites = false): Promise<Item[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      throw new Error('인증되지 않은 사용자입니다.');
    }

    let query = supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        ${includeFavorites ? 'favorites:item_favorites!inner(id),' : ''}
        usage_stats:item_usage_stats(quote_count, unique_quotes, total_quantity_used, last_used_at)
      `
      )
      .eq('is_active', true)
      .eq('user_id', user.user.id);

    if (includeFavorites) {
      query = query.eq('favorites.user_id', user.user.id);
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Items fetch error:', error);
      throw new Error(`품목 조회 실패: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      is_favorite: includeFavorites || (item.favorites && item.favorites.length > 0),
      usage_count: item.usage_stats?.[0]?.quote_count || 0,
      last_used_at: item.usage_stats?.[0]?.last_used_at
    }));
  }

  /**
   * 단일 품목 조회
   */
  static async getItem(id: string): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Item fetch error:', error);
      throw new Error(`품목 조회 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 품목 생성
   */
  static async createItem(itemData: CreateItemData): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .insert({
        ...itemData,
        is_active: true,
      })
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .single();

    if (error) {
      console.error('Item creation error:', error);
      if (error.code === '23505') {
        throw new Error('이미 존재하는 SKU입니다.');
      }
      throw new Error(`품목 생성 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 품목 수정
   */
  static async updateItem(id: string, updates: UpdateItemData): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .single();

    if (error) {
      console.error('Item update error:', error);
      throw new Error(`품목 수정 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 품목 삭제
   */
  static async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('items')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Item deletion error:', error);
      throw new Error(`품목 삭제 실패: ${error.message}`);
    }
  }

  /**
   * SKU 중복 확인
   */
  static async checkSkuExists(
    sku: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('items')
      .select('id')
      .eq('sku', sku)
      .eq('is_active', true);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('SKU check error:', error);
      throw new Error(`SKU 확인 실패: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }

  /**
   * 즐겨찾기 추가/제거
   */
  static async toggleFavorite(itemId: string): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      throw new Error('인증되지 않은 사용자입니다.');
    }

    // 현재 즐겨찾기 상태 확인
    const { data: existing } = await supabase
      .from('item_favorites')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      // 즐겨찾기 제거
      const { error } = await supabase
        .from('item_favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Remove favorite error:', error);
        throw new Error(`즐겨찾기 제거 실패: ${error.message}`);
      }
      return false;
    } else {
      // 즐겨찾기 추가
      const { error } = await supabase
        .from('item_favorites')
        .insert({
          user_id: user.user.id,
          item_id: itemId
        });

      if (error) {
        console.error('Add favorite error:', error);
        throw new Error(`즐겨찾기 추가 실패: ${error.message}`);
      }
      return true;
    }
  }

  /**
   * 품목 가격 변경 이력 조회
   */
  static async getPriceHistory(itemId: string): Promise<ItemPriceHistory[]> {
    const { data, error } = await supabase
      .from('item_price_history')
      .select('*')
      .eq('item_id', itemId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Price history fetch error:', error);
      throw new Error(`가격 이력 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 품목 사용 통계 조회
   */
  static async getUsageStats(): Promise<ItemUsageStats[]> {
    const { data, error } = await supabase
      .from('item_usage_stats')
      .select('*')
      .order('quote_count', { ascending: false });

    if (error) {
      console.error('Usage stats fetch error:', error);
      throw new Error(`사용 통계 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 특정 품목의 사용 통계 조회
   */
  static async getItemUsageStats(itemId: string): Promise<ItemUsageStats | null> {
    const { data, error } = await supabase
      .from('item_usage_stats')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('Item usage stats fetch error:', error);
      if (error.code === 'PGRST116') return null; // No rows found
      throw new Error(`품목 사용 통계 조회 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 즐겨찾기 품목만 조회
   */
  static async getFavoriteItems(): Promise<Item[]> {
    return this.getItems(true);
  }

  /**
   * 바코드로 품목 검색
   */
  static async getItemByBarcode(barcode: string): Promise<Item | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      throw new Error('인증되지 않은 사용자입니다.');
    }

    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .eq('barcode', barcode)
      .eq('is_active', true)
      .eq('user_id', user.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.error('Barcode search error:', error);
      throw new Error(`바코드 검색 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 재고 부족 품목 조회
   */
  static async getLowStockItems(): Promise<Item[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      throw new Error('인증되지 않은 사용자입니다.');
    }

    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .eq('is_active', true)
      .eq('user_id', user.user.id)
      .not('minimum_stock_level', 'is', null)
      .filter('stock_quantity', 'lte', 'minimum_stock_level')
      .order('stock_quantity');

    if (error) {
      console.error('Low stock items fetch error:', error);
      throw new Error(`재고 부족 품목 조회 실패: ${error.message}`);
    }

    return data || [];
  }
}
