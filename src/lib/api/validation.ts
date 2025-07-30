// API 요청 데이터 검증 스키마

export interface QuoteValidation {
  title: string;
  customer_id: string;
  project_id?: string;
  description?: string;
  valid_until?: string;
  terms?: string;
  notes?: string;
  tax_rate: number;
  quote_groups: QuoteGroupValidation[];
}

export interface QuoteGroupValidation {
  id?: string;
  title: string;
  sort_order: number;
  quote_items: QuoteItemValidation[];
}

export interface QuoteItemValidation {
  id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  supplier_id?: string;
  sort_order: number;
  quote_item_details: QuoteItemDetailValidation[];
}

export interface QuoteItemDetailValidation {
  id?: string;
  detail_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

export interface CustomerValidation {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  tax_number?: string;
  payment_terms?: number;
  notes?: string;
  status?: 'active' | 'inactive';
}

export interface SupplierValidation {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  tax_number?: string;
  payment_terms?: number;
  notes?: string;
  status?: 'active' | 'inactive';
}

export interface ProjectValidation {
  name: string;
  customer_id: string;
  description?: string;
  status?: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  assigned_to?: string;
}

// 검증 함수들
export function validateQuote(data: any): QuoteValidation {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  if (!data.customer_id || typeof data.customer_id !== 'string') {
    throw new Error('Customer ID is required and must be a string');
  }

  if (
    typeof data.tax_rate !== 'number' ||
    data.tax_rate < 0 ||
    data.tax_rate > 100
  ) {
    throw new Error('Tax rate must be a number between 0 and 100');
  }

  if (!Array.isArray(data.quote_groups)) {
    throw new Error('Quote groups must be an array');
  }

  // Validate quote groups
  const quote_groups = data.quote_groups.map(
    (group: any, groupIndex: number) => {
      if (!group.title || typeof group.title !== 'string') {
        throw new Error(`Quote group ${groupIndex + 1}: Title is required`);
      }

      if (typeof group.sort_order !== 'number') {
        throw new Error(
          `Quote group ${groupIndex + 1}: Sort order must be a number`
        );
      }

      if (!Array.isArray(group.quote_items)) {
        throw new Error(
          `Quote group ${groupIndex + 1}: Quote items must be an array`
        );
      }

      // Validate quote items
      const quote_items = group.quote_items.map(
        (item: any, itemIndex: number) => {
          if (!item.item_name || typeof item.item_name !== 'string') {
            throw new Error(
              `Quote group ${groupIndex + 1}, item ${itemIndex + 1}: Item name is required`
            );
          }

          if (typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw new Error(
              `Quote group ${groupIndex + 1}, item ${itemIndex + 1}: Quantity must be a positive number`
            );
          }

          if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
            throw new Error(
              `Quote group ${groupIndex + 1}, item ${itemIndex + 1}: Unit price must be a non-negative number`
            );
          }

          if (!Array.isArray(item.quote_item_details)) {
            throw new Error(
              `Quote group ${groupIndex + 1}, item ${itemIndex + 1}: Quote item details must be an array`
            );
          }

          // Validate quote item details
          const quote_item_details = item.quote_item_details.map(
            (detail: any, detailIndex: number) => {
              if (
                !detail.detail_name ||
                typeof detail.detail_name !== 'string'
              ) {
                throw new Error(
                  `Quote group ${groupIndex + 1}, item ${itemIndex + 1}, detail ${detailIndex + 1}: Detail name is required`
                );
              }

              if (typeof detail.quantity !== 'number' || detail.quantity <= 0) {
                throw new Error(
                  `Quote group ${groupIndex + 1}, item ${itemIndex + 1}, detail ${detailIndex + 1}: Quantity must be a positive number`
                );
              }

              if (
                typeof detail.unit_price !== 'number' ||
                detail.unit_price < 0
              ) {
                throw new Error(
                  `Quote group ${groupIndex + 1}, item ${itemIndex + 1}, detail ${detailIndex + 1}: Unit price must be a non-negative number`
                );
              }

              return {
                id: detail.id,
                detail_name: detail.detail_name,
                description: detail.description || null,
                quantity: detail.quantity,
                unit_price: detail.unit_price,
                sort_order: detail.sort_order || 0,
              };
            }
          );

          return {
            id: item.id,
            item_name: item.item_name,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            supplier_id: item.supplier_id || null,
            sort_order: item.sort_order || 0,
            quote_item_details,
          };
        }
      );

      return {
        id: group.id,
        title: group.title,
        sort_order: group.sort_order,
        quote_items,
      };
    }
  );

  return {
    title: data.title,
    customer_id: data.customer_id,
    project_id: data.project_id || null,
    description: data.description || null,
    valid_until: data.valid_until || null,
    terms: data.terms || null,
    notes: data.notes || null,
    tax_rate: data.tax_rate,
    quote_groups,
  };
}

export function validateCustomer(data: any): CustomerValidation {
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Name is required and must be a string');
  }

  if (data.email && typeof data.email !== 'string') {
    throw new Error('Email must be a string');
  }

  if (
    data.payment_terms &&
    (typeof data.payment_terms !== 'number' || data.payment_terms < 0)
  ) {
    throw new Error('Payment terms must be a non-negative number');
  }

  if (data.status && !['active', 'inactive'].includes(data.status)) {
    throw new Error('Status must be either "active" or "inactive"');
  }

  return {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    contact_person: data.contact_person || null,
    tax_number: data.tax_number || null,
    payment_terms: data.payment_terms || 30,
    notes: data.notes || null,
    status: data.status || 'active',
  };
}

export function validateSupplier(data: any): SupplierValidation {
  // 공급업체는 고객과 동일한 검증 로직 사용
  return validateCustomer(data);
}

export function validateProject(data: any): ProjectValidation {
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Name is required and must be a string');
  }

  if (!data.customer_id || typeof data.customer_id !== 'string') {
    throw new Error('Customer ID is required and must be a string');
  }

  if (
    data.status &&
    !['planning', 'active', 'completed', 'cancelled'].includes(data.status)
  ) {
    throw new Error(
      'Status must be one of: planning, active, completed, cancelled'
    );
  }

  if (data.budget && (typeof data.budget !== 'number' || data.budget < 0)) {
    throw new Error('Budget must be a non-negative number');
  }

  return {
    name: data.name,
    customer_id: data.customer_id,
    description: data.description || null,
    status: data.status || 'planning',
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    budget: data.budget || null,
    assigned_to: data.assigned_to || null,
  };
}
