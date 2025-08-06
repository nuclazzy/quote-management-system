// CSV 템플릿 처리 및 검증 유틸리티
export interface CustomerCSVRow {
  회사명: string;
  사업자번호: string;
  담당자: string;
  전화번호?: string;
  이메일?: string;
  주소?: string;
  결제조건?: string;
  할인율?: string;
  메모?: string;
  상태?: string;
}

export interface CustomerImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errors: string[];
  warnings: string[];
  data: Omit<any, 'id' | 'created_at' | 'updated_at'>[];
}

// CSV 템플릿 헤더 정의
export const CSV_TEMPLATE_HEADERS: (keyof CustomerCSVRow)[] = [
  '회사명',
  '사업자번호', 
  '담당자',
  '전화번호',
  '이메일',
  '주소',
  '결제조건',
  '할인율',
  '메모',
  '상태'
];

// CSV 템플릿 샘플 데이터
export const CSV_TEMPLATE_SAMPLE: CustomerCSVRow[] = [
  {
    회사명: '(주)모션센스',
    사업자번호: '123-45-67890',
    담당자: '김담당',
    전화번호: '02-1234-5678',
    이메일: 'contact@motionsense.co.kr',
    주소: '서울시 강남구 테헤란로 123',
    결제조건: '월말 정산',
    할인율: '0',
    메모: '주요 고객사',
    상태: 'active'
  },
  {
    회사명: '삼성전자',
    사업자번호: '987-65-43210',
    담당자: '이매니저',
    전화번호: '02-9876-5432',
    이메일: 'manager@samsung.com',
    주소: '서울시 서초구 서초대로 74',
    결제조건: '현금 결제',
    할인율: '5.5',
    메모: '대기업 고객',
    상태: 'active'
  }
];

// CSV 템플릿 생성 함수
export function generateCSVTemplate(): string {
  const headers = CSV_TEMPLATE_HEADERS.join(',');
  const samples = CSV_TEMPLATE_SAMPLE.map(row => 
    CSV_TEMPLATE_HEADERS.map(header => `"${row[header] || ''}"`).join(',')
  ).join('\n');
  
  return `${headers}\n${samples}`;
}

// CSV 파일 파싱 및 검증 함수
export function parseAndValidateCustomerCSV(csvContent: string): CustomerImportResult {
  const result: CustomerImportResult = {
    success: false,
    totalRows: 0,
    validRows: 0,
    errors: [],
    warnings: [],
    data: []
  };

  try {
    // CSV 파싱
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      result.errors.push('CSV 파일이 비어있거나 헤더만 포함되어 있습니다.');
      return result;
    }

    // 헤더 검증
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    const requiredHeaders = ['회사명', '사업자번호', '담당자'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        result.errors.push(`필수 헤더 '${required}'이(가) 누락되었습니다.`);
      }
    }

    if (result.errors.length > 0) {
      return result;
    }

    // 데이터 행 처리
    result.totalRows = lines.length - 1;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);
        const rowData: CustomerCSVRow = {};
        
        // 헤더와 값 매핑
        headers.forEach((header, index) => {
          if (index < values.length) {
            rowData[header as keyof CustomerCSVRow] = values[index].trim();
          }
        });

        // 개별 행 검증
        const rowErrors = validateCustomerRow(rowData, i + 1);
        if (rowErrors.length > 0) {
          result.errors.push(...rowErrors);
          continue;
        }

        // 유효한 데이터 변환
        const validData = transformCustomerData(rowData);
        result.data.push(validData);
        result.validRows++;

      } catch (error) {
        result.errors.push(`${i + 1}행: CSV 파싱 오류 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }
    }

    result.success = result.validRows > 0 && result.errors.length === 0;
    
    if (result.validRows < result.totalRows) {
      result.warnings.push(`전체 ${result.totalRows}행 중 ${result.validRows}행만 유효합니다.`);
    }

  } catch (error) {
    result.errors.push(`CSV 파일 처리 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }

  return result;
}

// CSV 라인 파싱 (따옴표 처리 포함)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 이스케이프된 따옴표
        current += '"';
        i++; // 다음 문자 건너뛰기
      } else {
        // 따옴표 상태 토글
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 구분자
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // 마지막 필드 추가
  return result;
}

// 개별 고객사 행 검증
function validateCustomerRow(row: CustomerCSVRow, rowNumber: number): string[] {
  const errors: string[] = [];
  
  // 필수 필드 검증
  if (!row.회사명?.trim()) {
    errors.push(`${rowNumber}행: 회사명은 필수입니다.`);
  }
  
  if (!row.사업자번호?.trim()) {
    errors.push(`${rowNumber}행: 사업자번호는 필수입니다.`);
  } else {
    // 사업자번호 형식 검증 (기본적인 형식만)
    const businessNumber = row.사업자번호.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(businessNumber)) {
      errors.push(`${rowNumber}행: 사업자번호 형식이 올바르지 않습니다. (10자리 숫자)`);
    }
  }
  
  if (!row.담당자?.trim()) {
    errors.push(`${rowNumber}행: 담당자는 필수입니다.`);
  }
  
  // 이메일 형식 검증
  if (row.이메일?.trim()) {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(row.이메일.trim())) {
      errors.push(`${rowNumber}행: 이메일 형식이 올바르지 않습니다.`);
    }
  }
  
  // 할인율 검증
  if (row.할인율?.trim()) {
    const discountRate = parseFloat(row.할인율);
    if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
      errors.push(`${rowNumber}행: 할인율은 0~100 사이의 숫자여야 합니다.`);
    }
  }
  
  // 상태 검증
  if (row.상태?.trim()) {
    const validStatuses = ['active', 'inactive', '활성', '비활성'];
    if (!validStatuses.includes(row.상태.trim())) {
      errors.push(`${rowNumber}행: 상태는 'active', 'inactive', '활성', '비활성' 중 하나여야 합니다.`);
    }
  }
  
  return errors;
}

// 고객사 데이터 변환
function transformCustomerData(row: CustomerCSVRow): any {
  // 상태 변환
  let status = 'active';
  if (row.상태?.trim()) {
    const statusValue = row.상태.trim().toLowerCase();
    if (statusValue === 'inactive' || statusValue === '비활성') {
      status = 'inactive';
    }
  }
  
  // 할인율 변환
  let discountRate = 0;
  if (row.할인율?.trim()) {
    const parsed = parseFloat(row.할인율);
    if (!isNaN(parsed)) {
      discountRate = parsed;
    }
  }
  
  return {
    name: row.회사명?.trim() || '',
    business_number: row.사업자번호?.trim() || '',
    contact_person: row.담당자?.trim() || '',
    phone: row.전화번호?.trim() || '',
    email: row.이메일?.trim() || '',
    address: row.주소?.trim() || '',
    payment_terms: row.결제조건?.trim() || '월말 정산',
    discount_rate: discountRate,
    notes: row.메모?.trim() || '',
    status
  };
}

// CSV 다운로드 헬퍼
export function downloadCSVTemplate() {
  const csvContent = generateCSVTemplate();
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `고객사_업로드_템플릿_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}