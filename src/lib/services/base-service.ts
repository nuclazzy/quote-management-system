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
      try {
        this._supabase = createClient();
        console.log('Supabase client created successfully in BaseService');
      } catch (error) {
        console.error('Failed to create Supabase client in BaseService:', error);
        throw new Error('Supabase client initialization failed');
      }
    }
    return this._supabase;
  }

  protected async getUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Auth error in BaseService:', error);
        throw new Error(`Authentication failed: ${error.message}`);
      }
      if (!user) {
        throw new Error('No authenticated user found');
      }
      console.log('User authenticated successfully:', user.id);
      return user;
    } catch (error) {
      console.error('getUser failed in BaseService:', error);
      throw error;
    }
  }

  protected async getUserProfile(userId: string) {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw new Error(`Profile fetch failed: ${error.message}`);
      }
      
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      return profile;
    } catch (error) {
      console.error('getUserProfile failed:', error);
      throw error;
    }
  }

  protected handleError(error: any): ServiceResponse<null> {
    console.error('Service error:', error);
    
    // Supabase client initialization errors
    if (error?.message?.includes('Supabase client initialization failed')) {
      return {
        error: 'Database connection failed. Please check your internet connection and try again.',
        status: 503
      };
    }
    
    // Authentication errors
    if (error?.message?.includes('Authentication failed')) {
      return {
        error: 'Authentication failed. Please log in again.',
        status: 401
      };
    }
    
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
      error: error?.message || 'An unexpected error occurred',
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