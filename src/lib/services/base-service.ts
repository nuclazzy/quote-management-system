import { createClient } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface ServiceResponse<T> {
  data?: T;
  error?: string | PostgrestError;
  status?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BaseService {
  private _supabase: ReturnType<typeof createClient> | null = null;
  
  protected get supabase() {
    if (!this._supabase) {
      this._supabase = createClient();
    }
    return this._supabase;
  }

  protected async getUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Unauthorized');
    }
    return user;
  }

  protected async getUserProfile(userId: string) {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('User profile not found');
    }
    return profile;
  }

  protected handleError(error: any): ServiceResponse<null> {
    console.error('Service error:', error);
    
    if (error instanceof Error) {
      return {
        error: error.message,
        status: 500
      };
    }
    
    if (error?.code === 'PGRST116') {
      return {
        error: 'Resource not found',
        status: 404
      };
    }
    
    return {
      error: error?.message || 'An error occurred',
      status: 500
    };
  }

  protected createPaginationQuery(
    query: any,
    params: PaginationParams,
    defaultSort = 'created_at'
  ) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 10, 100);
    const sortBy = params.sortBy || defaultSort;
    const sortOrder = params.sortOrder || 'desc';

    return query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);
  }
}