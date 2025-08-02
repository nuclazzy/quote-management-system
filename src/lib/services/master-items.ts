import { MasterItem } from '@/types/motionsense-quote';
import { MasterItemInput, MasterItemUpdateInput, MasterItemQuery } from '@/lib/validations/master-items';

interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ApiError {
  error: string;
  details?: any;
}

export class MasterItemsService {
  private static baseUrl = '/api/master-items';

  // 마스터 품목 목록 조회
  static async getAll(params: Partial<MasterItemQuery> = {}): Promise<ApiResponse<MasterItem[]>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to fetch master items');
    }

    return response.json();
  }

  // 특정 마스터 품목 조회
  static async getById(id: string): Promise<ApiResponse<MasterItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to fetch master item');
    }

    return response.json();
  }

  // 새 마스터 품목 생성
  static async create(data: MasterItemInput): Promise<ApiResponse<MasterItem>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to create master item');
    }

    return response.json();
  }

  // 마스터 품목 수정
  static async update(id: string, data: MasterItemUpdateInput): Promise<ApiResponse<MasterItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to update master item');
    }

    return response.json();
  }

  // 마스터 품목 삭제 (소프트 삭제)
  static async delete(id: string): Promise<ApiResponse<MasterItem>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to delete master item');
    }

    return response.json();
  }

  // 카테고리 목록 조회 (기존 데이터에서 추출)
  static async getCategories(): Promise<string[]> {
    try {
      const response = await this.getAll({ is_active: true, limit: 1000 });
      const categories = [...new Set(response.data.map(item => item.category))];
      return categories.sort();
    } catch (error) {
      console.error('카테고리 조회 중 오류:', error);
      return [];
    }
  }
}