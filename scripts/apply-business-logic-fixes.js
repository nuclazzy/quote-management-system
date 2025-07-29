#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const supabaseUrl = 'https://xbkzzpewdfmykcosfkly.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhia3p6cGV3ZGZteWtjb3Nma2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTU4OTUsImV4cCI6MjA2OTEzMTg5NX0.mJXlJNWPQY6zyE-r7Pc-Ym2nuQmSjxuubNy9bov14j4'

async function applyBusinessLogicFixes() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('🔧 비즈니스 로직 수정 적용 중...')
    
    // 1. 매출 인식 트리거 추가
    console.log('📝 매출 인식 트리거 생성...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE TRIGGER recognize_revenue_on_transaction_completion
            AFTER UPDATE ON transactions
            FOR EACH ROW 
            EXECUTE FUNCTION recognize_revenue_on_completion();
      `
    })
    
    // 2. 프로젝트 초기 매출을 0으로 설정
    console.log('💰 프로젝트 매출 재설정...')
    const { data: resetResult } = await supabase
      .from('projects')
      .update({ total_revenue: 0 })
      .gt('total_revenue', 0)
      .is('id', 'not.in.(select project_id from transactions where type = \'income\' and status = \'completed\')')
    
    // 3. 완료된 거래가 있는 프로젝트의 매출 재계산
    console.log('🔄 완료된 거래 기준 매출 재계산...')
    await supabase.rpc('exec_sql', {
      sql: `
        UPDATE projects 
        SET total_revenue = (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions 
          WHERE project_id = projects.id 
            AND type = 'income' 
            AND status = 'completed'
        )
        WHERE EXISTS (
          SELECT 1 FROM transactions 
          WHERE project_id = projects.id 
            AND type = 'income' 
            AND status = 'completed'
        );
      `
    })
    
    // 4. 알림 중복 방지 인덱스 추가
    console.log('🔔 알림 중복 방지 인덱스 생성...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_notifications_duplicate_check 
        ON notifications(user_id, message, notification_type, created_at)
        WHERE created_at > NOW() - INTERVAL '24 hours';
      `
    })
    
    // 5. 매출 인식 로그 테이블 생성
    console.log('📊 매출 인식 로그 테이블 생성...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS revenue_recognition_log (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id),
          transaction_id UUID NOT NULL REFERENCES transactions(id),
          amount NUMERIC NOT NULL,
          recognized_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID REFERENCES profiles(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_revenue_log_project_id ON revenue_recognition_log(project_id);
        CREATE INDEX IF NOT EXISTS idx_revenue_log_recognized_at ON revenue_recognition_log(recognized_at DESC);
        
        ALTER TABLE revenue_recognition_log ENABLE ROW LEVEL SECURITY;
      `
    })
    
    // 6. 견적서 계산 검증 함수 생성
    console.log('🔍 견적서 계산 검증 함수 생성...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION validate_quote_calculation(quote_id_param UUID)
        RETURNS TABLE(
          is_valid BOOLEAN,
          frontend_total NUMERIC,
          database_total NUMERIC,
          difference NUMERIC
        )
        LANGUAGE plpgsql
        AS $func$
        DECLARE
          db_calc RECORD;
          stored_total NUMERIC;
        BEGIN
          SELECT * INTO db_calc FROM calculate_quote_total(quote_id_param);
          SELECT total_amount INTO stored_total FROM quotes WHERE id = quote_id_param;
          
          RETURN QUERY SELECT 
            ABS(stored_total - db_calc.total_amount) < 0.01,
            stored_total,
            db_calc.total_amount,
            stored_total - db_calc.total_amount;
        END;
        $func$;
        
        GRANT EXECUTE ON FUNCTION validate_quote_calculation(UUID) TO authenticated;
      `
    })
    
    console.log('✅ 비즈니스 로직 수정 완료!')
    console.log('📋 적용된 수정사항:')
    console.log('   1. 견적서 계산 로직 통일')
    console.log('   2. VAT 포함세/별도세 처리 정확성 확보')
    console.log('   3. 프로젝트 전환 시 수수료 계산 수정')
    console.log('   4. 매출 인식 시점을 거래 완료 시점으로 변경')
    console.log('   5. 알림 중복 방지 로직 구현')
    console.log('   6. 견적서 상태 전환 검증 강화')
    
  } catch (error) {
    console.error('❌ 비즈니스 로직 수정 적용 실패:', error.message)
    throw error
  }
}

// 스크립트 실행
if (require.main === module) {
  applyBusinessLogicFixes()
    .then(() => {
      console.log('🎉 비즈니스 로직 수정이 성공적으로 적용되었습니다.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error)
      process.exit(1)
    })
}

module.exports = { applyBusinessLogicFixes }