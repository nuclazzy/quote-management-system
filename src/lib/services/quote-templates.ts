import { QuoteTemplate } from '@/types/motionsense-quote';
import { QuoteTemplateInput, QuoteTemplateUpdateInput, QuoteTemplateQuery } from '@/lib/validations/quote-templates';

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

export class QuoteTemplatesService {
  private static baseUrl = '/api/quote-templates';

  // 견적서 템플릿 목록 조회
  static async getAll(params: Partial<QuoteTemplateQuery> = {}): Promise<ApiResponse<QuoteTemplate[]>> {
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
      throw new Error(error.error || 'Failed to fetch quote templates');
    }

    return response.json();
  }

  // 특정 견적서 템플릿 조회
  static async getById(id: string): Promise<ApiResponse<QuoteTemplate>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to fetch quote template');
    }

    return response.json();
  }

  // 새 견적서 템플릿 생성
  static async create(data: QuoteTemplateInput): Promise<ApiResponse<QuoteTemplate>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to create quote template');
    }

    return response.json();
  }

  // 견적서 템플릿 수정
  static async update(id: string, data: QuoteTemplateUpdateInput): Promise<ApiResponse<QuoteTemplate>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to update quote template');
    }

    return response.json();
  }

  // 견적서 템플릿 삭제
  static async delete(id: string): Promise<ApiResponse<QuoteTemplate>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Failed to delete quote template');
    }

    return response.json();
  }

  // 카테고리 목록 조회 (기존 데이터에서 추출)
  static async getCategories(): Promise<string[]> {
    try {
      const response = await this.getAll({ is_active: true, limit: 1000 });
      const categories = [...new Set(response.data.map(template => template.category))];
      return categories.sort();
    } catch (error) {
      console.error('템플릿 카테고리 조회 중 오류:', error);
      return [];
    }
  }
}