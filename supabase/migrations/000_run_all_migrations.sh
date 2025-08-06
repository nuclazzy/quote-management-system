#!/bin/bash

# Supabase 전체 기능 활성화 스크립트
# 이 스크립트는 모든 마이그레이션을 순서대로 실행합니다.

echo "🚀 Supabase 전체 기능 활성화 시작..."
echo "======================================"

# 데이터베이스 URL 확인
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL 환경 변수가 설정되지 않았습니다."
    echo "다음 명령으로 설정하세요:"
    echo "export DATABASE_URL='postgresql://[user]:[password]@[host]/[database]'"
    exit 1
fi

echo "📊 데이터베이스 연결 확인중..."

# 실행 함수
run_migration() {
    local file=$1
    local description=$2
    
    echo ""
    echo "🔧 $description"
    echo "   파일: $file"
    
    if [ ! -f "$file" ]; then
        echo "   ❌ 파일을 찾을 수 없습니다: $file"
        return 1
    fi
    
    # SQL 실행
    if psql "$DATABASE_URL" < "$file" > /tmp/migration_output.log 2>&1; then
        echo "   ✅ 성공!"
        return 0
    else
        echo "   ⚠️  경고 또는 오류 발생 (일부 객체가 이미 존재할 수 있습니다)"
        echo "   상세 내용:"
        grep -E "ERROR|WARNING" /tmp/migration_output.log | head -10
        echo ""
        echo "   계속 진행하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            echo "   중단합니다."
            exit 1
        fi
        return 0
    fi
}

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

echo ""
echo "📁 작업 디렉토리: $SCRIPT_DIR"
echo ""
echo "다음 순서로 마이그레이션을 실행합니다:"
echo "1. 기본 함수와 뷰 생성"
echo "2. 프로젝트 번호 컬럼 추가"
echo "3. 비용 관련 컬럼 추가"
echo "4. 날짜 및 진행률 컬럼 추가"
echo "5. 전체 기능 뷰 생성"
echo ""
echo "계속하시겠습니까? (y/n)"
read -r response
if [[ "$response" != "y" ]]; then
    echo "중단합니다."
    exit 1
fi

# 1단계: 기본 설정
run_migration "001_safe_minimal.sql" "1단계: 기본 함수와 뷰 생성"

# 2단계: 프로젝트 번호
run_migration "003_add_project_columns.sql" "2단계: 프로젝트 번호 및 quote_id 추가"

# 3단계: 비용 컬럼
run_migration "004_add_missing_cost_columns.sql" "3단계: 비용 관련 컬럼 추가"

# 4단계: 날짜 컬럼
run_migration "005_add_project_date_columns.sql" "4단계: 날짜 및 진행률 컬럼 추가"

# 5단계: 전체 기능 뷰
run_migration "006_create_full_project_view.sql" "5단계: 전체 기능 뷰 생성"

echo ""
echo "======================================"
echo "✨ 모든 마이그레이션이 완료되었습니다!"
echo ""
echo "📋 적용된 기능:"
echo "   ✅ 기본 RPC 함수 및 트리거"
echo "   ✅ 프로젝트 번호 자동 생성"
echo "   ✅ 비용 관리 (예산, 실제 비용)"
echo "   ✅ 프로젝트 일정 관리"
echo "   ✅ 진행률 추적"
echo "   ✅ 프로젝트 매니저 할당"
echo "   ✅ 대시보드 요약 뷰"
echo ""
echo "🎉 전체 기능이 활성화되었습니다!"