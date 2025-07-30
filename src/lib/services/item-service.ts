import { supabase } from '../supabase/client';

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
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
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  category_id?: string;
  unit?: string;
  unit_price?: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  is_active?: boolean;
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
  static async getItems(): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*)
      `
      )
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Items fetch error:', error);
      throw new Error(`품목 조회 실패: ${error.message}`);
    }

    return data || [];
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
}
