// 입력 검증 유틸리티

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// 기본 검증 규칙
export const businessValidationRules = {
  // 견적서 검증
  quote: {
    title: {
      required: true,
      min: 2,
      max: 100,
    },
    customer_id: {
      required: true,
    },
    valid_until: {
      required: true,
      custom: (value: string) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date <= today) {
          return '유효 기한은 오늘 이후여야 합니다.';
        }
        return null;
      },
    },
    tax_rate: {
      min: 0,
      max: 30,
      custom: (value: number) => {
        if (value < 0 || value > 30) {
          return '세율은 0% ~ 30% 사이여야 합니다.';
        }
        return null;
      },
    },
  },

  // 견적 항목 검증
  quoteItem: {
    item_name: {
      required: true,
      min: 1,
      max: 200,
    },
    quantity: {
      required: true,
      min: 0.01,
      custom: (value: number) => {
        if (value <= 0) {
          return '수량은 0보다 커야 합니다.';
        }
        return null;
      },
    },
    unit_price: {
      required: true,
      min: 0,
      custom: (value: number) => {
        if (value < 0) {
          return '단가는 0 이상이어야 합니다.';
        }
        return null;
      },
    },
    commission_rate: {
      min: 0,
      max: 50,
      custom: (value: number) => {
        if (value < 0 || value > 50) {
          return '수수료율은 0% ~ 50% 사이여야 합니다.';
        }
        return null;
      },
    },
    discount_rate: {
      min: 0,
      max: 100,
      custom: (value: number) => {
        if (value < 0 || value > 100) {
          return '할인율은 0% ~ 100% 사이여야 합니다.';
        }
        return null;
      },
    },
  },

  // 고객사 검증
  customer: {
    name: {
      required: true,
      min: 2,
      max: 100,
    },
    business_number: {
      required: true,
      pattern: /^\d{3}-\d{2}-\d{5}$/,
      custom: (value: string) => {
        if (value && !/^\d{3}-?\d{2}-?\d{5}$/.test(value)) {
          return '올바른 사업자등록번호 형식이 아닙니다. (예: 123-45-67890)';
        }
        return null;
      },
    },
    contact_person: {
      required: true,
      min: 2,
      max: 50,
    },
    email: {
      pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      custom: (value: string) => {
        if (value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return '올바른 이메일 형식이 아닙니다.';
        }
        return null;
      },
    },
    phone: {
      pattern: /^(\+82|0)([0-9]{1,2})-?([0-9]{3,4})-?([0-9]{4})$/,
      custom: (value: string) => {
        if (
          value &&
          !/^(\+82|0)([0-9]{1,2})-?([0-9]{3,4})-?([0-9]{4})$/.test(value)
        ) {
          return '올바른 전화번호 형식이 아닙니다.';
        }
        return null;
      },
    },
  },

  // 공급업체 검증
  supplier: {
    name: {
      required: true,
      min: 2,
      max: 100,
    },
    business_number: {
      required: true,
      pattern: /^\d{3}-\d{2}-\d{5}$/,
      custom: (value: string) => {
        if (value && !/^\d{3}-?\d{2}-?\d{5}$/.test(value)) {
          return '올바른 사업자등록번호 형식이 아닙니다.';
        }
        return null;
      },
    },
    contact_person: {
      required: true,
      min: 2,
      max: 50,
    },
    category: {
      required: true,
    },
  },

  // 품목 검증
  item: {
    name: {
      required: true,
      min: 2,
      max: 200,
    },
    category: {
      required: true,
    },
    unit: {
      required: true,
    },
    unit_price: {
      required: true,
      min: 0,
    },
    sku: {
      required: true,
      min: 3,
      max: 50,
      pattern: /^[A-Z0-9-_]+$/i,
      custom: (value: string) => {
        if (value && !/^[A-Z0-9-_]+$/i.test(value)) {
          return 'SKU는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능합니다.';
        }
        return null;
      },
    },
    cost_price: {
      min: 0,
      custom: (value: number, data: any) => {
        if (value > 0 && data.unit_price > 0 && value > data.unit_price) {
          return '원가는 판매가보다 클 수 없습니다.';
        }
        return null;
      },
    },
  },
};

// 검증 함수
export function validateField(
  value: any,
  rule: ValidationRule,
  data?: any
): string | null {
  // 필수 필드 검증
  if (
    rule.required &&
    (value === undefined || value === null || value === '')
  ) {
    return '필수 입력 항목입니다.';
  }

  // 값이 없으면 선택적 검증은 스킵
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // 최소값 검증
  if (rule.min !== undefined) {
    if (typeof value === 'string' && value.length < rule.min) {
      return `최소 ${rule.min}글자 이상 입력해주세요.`;
    }
    if (typeof value === 'number' && value < rule.min) {
      return `최소값은 ${rule.min}입니다.`;
    }
  }

  // 최대값 검증
  if (rule.max !== undefined) {
    if (typeof value === 'string' && value.length > rule.max) {
      return `최대 ${rule.max}글자까지 입력 가능합니다.`;
    }
    if (typeof value === 'number' && value > rule.max) {
      return `최대값은 ${rule.max}입니다.`;
    }
  }

  // 패턴 검증
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return '올바른 형식이 아닙니다.';
  }

  // 커스텀 검증
  if (rule.custom) {
    const customError = rule.custom(value, data);
    if (customError) {
      return customError;
    }
  }

  return null;
}

// 객체 검증
export function validateObject(
  data: any,
  rules: ValidationRules
): ValidationResult {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [field, rule] of Object.entries(rules)) {
    const error = validateField(data[field], rule, data);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// 실시간 검증을 위한 디바운스 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 비즈니스 로직 검증
export const businessLogicValidators = {
  // 견적서 총액 검증
  validateQuoteTotal: (items: any[], taxRate: number = 0) => {
    const subtotal = items.reduce((sum, item) => {
      return (
        sum +
        item.quantity * item.unit_price * (1 - (item.discount_rate || 0) / 100)
      );
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    if (total <= 0) {
      return '견적서 총액은 0보다 커야 합니다.';
    }

    if (total > 999999999) {
      return '견적서 총액이 너무 큽니다.';
    }

    return null;
  },

  // 견적서 유효기간 검증
  validateQuoteExpiry: (validUntil: string, createdAt?: string) => {
    const expiryDate = new Date(validUntil);
    const baseDate = createdAt ? new Date(createdAt) : new Date();

    if (expiryDate <= baseDate) {
      return '유효기간은 생성일 이후여야 합니다.';
    }

    const diffDays = Math.ceil(
      (expiryDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 365) {
      return '유효기간은 1년을 초과할 수 없습니다.';
    }

    return null;
  },

  // 재고 검증
  validateStock: (
    requestedQuantity: number,
    availableStock: number,
    minStock: number = 0
  ) => {
    if (requestedQuantity > availableStock) {
      return `재고가 부족합니다. (사용 가능: ${availableStock})`;
    }

    if (availableStock - requestedQuantity < minStock) {
      return `최소 재고량을 유지해야 합니다. (최소: ${minStock})`;
    }

    return null;
  },
};

// 파일 검증
export const fileValidators = {
  validateImageFile: (file: File, maxSizeMB: number = 5) => {
    if (!file.type.startsWith('image/')) {
      return '이미지 파일만 업로드 가능합니다.';
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`;
    }

    return null;
  },

  validateExcelFile: (file: File, maxSizeMB: number = 10) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Excel 또는 CSV 파일만 업로드 가능합니다.';
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`;
    }

    return null;
  },
};
