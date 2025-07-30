const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 환경변수 로드
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '설정됨' : '누락')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '설정됨' : '누락')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration(migrationFile) {
  try {
    console.log(`🔄 마이그레이션 실행 중: ${migrationFile}`)
    
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile)
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log(`📄 SQL 파일 읽기 완료: ${migrationPath}`)
    
    // SQL을 세미콜론으로 분리하여 개별 실행
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 ${statements.length}개의 SQL 문장을 실행합니다.`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        try {
          console.log(`⚡ SQL 문장 ${i + 1}/${statements.length} 실행 중...`)
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            // RPC 함수가 없으면 직접 실행 시도
            if (error.message.includes('function exec_sql')) {
              console.log('   exec_sql RPC 함수가 없습니다. 직접 쿼리 실행을 시도합니다...')
              // Supabase는 직접 SQL 실행을 지원하지 않으므로, 수동으로 Supabase Studio에서 실행해야 함을 안내
              console.log('❌ Supabase는 클라이언트에서 직접 SQL 실행을 지원하지 않습니다.')
              console.log('📋 다음 SQL을 Supabase Studio의 SQL Editor에서 실행해주세요:')
              console.log('   URL: https://supabase.com/dashboard/project/xbkzzpewdfmykcosfkly/sql')
              console.log('─'.repeat(80))
              console.log(migrationSQL)
              console.log('─'.repeat(80))
              return
            }
            throw error
          }
          
          console.log(`✅ SQL 문장 ${i + 1} 실행 완료`)
        } catch (sqlError) {
          console.error(`❌ SQL 문장 ${i + 1} 실행 실패:`, sqlError.message)
          console.log('실패한 SQL:', statement.substring(0, 100) + '...')
          throw sqlError
        }
      }
    }
    
    console.log('✅ 마이그레이션 실행 완료!')
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 실패:', error.message)
    throw error
  }
}

// 명령행 인수에서 마이그레이션 파일명 가져오기
const migrationFile = process.argv[2] || '19_optimized_schema_redesign.sql'

console.log('🚀 마이그레이션 러너 시작')
console.log('📍 Supabase URL:', supabaseUrl)
console.log('📁 마이그레이션 파일:', migrationFile)

runMigration(migrationFile)
  .then(() => {
    console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 마이그레이션 실행 중 오류가 발생했습니다:', error)
    process.exit(1)
  })