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
  
  private debugLog(message: string, details?: any, status: 'success' | 'error' | 'warning' | 'loading' = 'loading') {
    const logData = {
      id: `base-service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'BaseService',
      status,
      message,
      details,
      timestamp: new Date()
    };
    
    console.log(`[BaseService Debug] ${message}`, details);
    
    // Visual debug logger
    if (typeof window !== 'undefined' && window.debugLogger) {
      window.debugLogger.addStep(logData);
    }
  }
  
  protected get supabase() {
    if (!this._supabase) {
      try {
        this.debugLog('BaseService에서 Supabase 클라이언트 생성 시작');
        this._supabase = createClient();
        this.debugLog('BaseService에서 Supabase 클라이언트 생성 성공', {
          hasClient: !!this._supabase,
          hasAuth: !!this._supabase?.auth
        }, 'success');
      } catch (error) {
        this.debugLog('BaseService에서 Supabase 클라이언트 생성 실패', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'error');
        throw new Error('Supabase client initialization failed');
      }
    }
    return this._supabase;
  }

  protected async getUser() {
    try {
      this.debugLog('사용자 인증 정보 확인 시작');
      
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        this.debugLog('사용자 인증 오류', {
          errorMessage: error.message,
          errorCode: error.name,
          status: error.status
        }, 'error');
        throw new Error(`Authentication failed: ${error.message}`);
      }
      
      if (!user) {
        this.debugLog('인증된 사용자 없음', null, 'warning');
        throw new Error('No authenticated user found');
      }
      
      this.debugLog('사용자 인증 성공', {
        userId: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at ? 'Yes' : 'No',
        lastSignIn: user.last_sign_in_at
      }, 'success');
      
      return user;
    } catch (error) {
      this.debugLog('getUser 함수 실패', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'error');
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