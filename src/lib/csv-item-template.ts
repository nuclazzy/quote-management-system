export interface ItemImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    imported: number;
  };
}

export function generateItemCSVTemplate(): string {
  const headers = [
    '품목명*',
    'SKU*',
    '설명',
    '카테고리*',
    '유형*',
    '단위*',
    '단가*',
    '현재재고*',
    '최소재고',
    '바코드'
  ];

  const sampleData = [
    [
      'HD 카메라',
      'CAM-HD-001',
      '풀HD 1080p 디지털 카메라',
      '촬영장비',
      'product',
      '대',
      '500000',
      '5',
      '2',
      '8801234567890'
    ],
    [
      '영상 편집 서비스',
      'EDIT-SVC-001',
      '전문 영상 편집 및 후보정 서비스',
      '편집서비스',
      'service',
      '건',
      '200000',
      '0',
      '0',
      ''
    ],
    [
      '조명 세트',
      'LIGHT-SET-001',
      'LED 조명 세트 (메인/보조/배경)',
      '조명장비',
      'product',
      'SET',
      '150000',
      '3',
      '1',
      '8801234567891'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function parseAndValidateItemCSV(csvContent: string): ItemImportResult {
  const result: ItemImportResult = {
    success: false,
    errors: [],
    warnings: [],
    summary: {
      totalRows: 0,
      validRows: 0,
      imported: 0
    }
  };

  try {
    // UTF-8 BOM 제거
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      result.errors.push('CSV 파일이 비어있습니다.');
      return result;
    }

    // 헤더 검증
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const requiredHeaders = ['품목명*', 'SKU*', '카테고리*', '유형*', '단위*', '단가*', '현재재고*'];
    const missingHeaders = requiredHeaders.filter(h => !headers.some(header => header.includes(h.replace('*', ''))));
    
    if (missingHeaders.length > 0) {
      result.errors.push(`필수 컬럼이 없습니다: ${missingHeaders.join(', ')}`);
      return result;
    }

    // 헤더 인덱스 매핑
    const getHeaderIndex = (headerName: string) => 
      headers.findIndex(h => h.includes(headerName));

    const nameIndex = getHeaderIndex('품목명');
    const skuIndex = getHeaderIndex('SKU');
    const descriptionIndex = getHeaderIndex('설명');
    const categoryIndex = getHeaderIndex('카테고리');
    const itemTypeIndex = getHeaderIndex('유형');
    const unitIndex = getHeaderIndex('단위');
    const unitPriceIndex = getHeaderIndex('단가');
    const stockQuantityIndex = getHeaderIndex('현재재고');
    const minStockIndex = getHeaderIndex('최소재고');
    const barcodeIndex = getHeaderIndex('바코드');

    const dataLines = lines.slice(1);
    result.summary.totalRows = dataLines.length;

    const validItems: any[] = [];
    const skuSet = new Set<string>();

    dataLines.forEach((line, index) => {
      const rowNumber = index + 2; // +2 because we start from line 2 (after header)
      const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());

      // 빈 행 건너뛰기
      if (cells.every(cell => !cell)) {
        return;
      }

      const item: any = {};
      let hasErrors = false;

      // 필수 필드 검증
      const name = cells[nameIndex];
      if (!name) {
        result.errors.push(`${rowNumber}행: 품목명이 필요합니다.`);
        hasErrors = true;
      } else {
        item.name = name;
      }

      const sku = cells[skuIndex];
      if (!sku) {
        result.errors.push(`${rowNumber}행: SKU가 필요합니다.`);
        hasErrors = true;
      } else if (skuSet.has(sku)) {
        result.errors.push(`${rowNumber}행: 중복된 SKU입니다: ${sku}`);
        hasErrors = true;
      } else {
        item.sku = sku;
        skuSet.add(sku);
      }

      const category = cells[categoryIndex];
      if (!category) {
        result.errors.push(`${rowNumber}행: 카테고리가 필요합니다.`);
        hasErrors = true;
      } else {
        item.category_name = category;
      }

      const itemType = cells[itemTypeIndex];
      if (!itemType) {
        result.errors.push(`${rowNumber}행: 유형이 필요합니다.`);
        hasErrors = true;
      } else if (!['product', 'service', '물품', '서비스'].includes(itemType.toLowerCase())) {
        result.errors.push(`${rowNumber}행: 유형은 'product', 'service', '물품', '서비스' 중 하나여야 합니다.`);
        hasErrors = true;
      } else {
        item.item_type = itemType.toLowerCase() === '물품' ? 'product' : 
                         itemType.toLowerCase() === '서비스' ? 'service' : itemType.toLowerCase();
      }

      const unit = cells[unitIndex];
      if (!unit) {
        result.errors.push(`${rowNumber}행: 단위가 필요합니다.`);
        hasErrors = true;
      } else {
        item.unit = unit;
      }

      const unitPriceStr = cells[unitPriceIndex];
      if (!unitPriceStr) {
        result.errors.push(`${rowNumber}행: 단가가 필요합니다.`);
        hasErrors = true;
      } else {
        const unitPrice = parseFloat(unitPriceStr.replace(/[^\d.-]/g, ''));
        if (isNaN(unitPrice) || unitPrice < 0) {
          result.errors.push(`${rowNumber}행: 올바른 단가 형식이 아닙니다: ${unitPriceStr}`);
          hasErrors = true;
        } else {
          item.unit_price = unitPrice;
        }
      }

      const stockQuantityStr = cells[stockQuantityIndex];
      if (!stockQuantityStr) {
        result.errors.push(`${rowNumber}행: 현재재고가 필요합니다.`);
        hasErrors = true;
      } else {
        const stockQuantity = parseInt(stockQuantityStr.replace(/[^\d-]/g, ''));
        if (isNaN(stockQuantity) || stockQuantity < 0) {
          result.errors.push(`${rowNumber}행: 올바른 재고 형식이 아닙니다: ${stockQuantityStr}`);
          hasErrors = true;
        } else {
          item.stock_quantity = stockQuantity;
        }
      }

      // 선택적 필드
      if (descriptionIndex >= 0 && cells[descriptionIndex]) {
        item.description = cells[descriptionIndex];
      }

      if (minStockIndex >= 0 && cells[minStockIndex]) {
        const minStock = parseInt(cells[minStockIndex].replace(/[^\d-]/g, ''));
        if (!isNaN(minStock) && minStock >= 0) {
          item.minimum_stock_level = minStock;
        } else {
          result.warnings.push(`${rowNumber}행: 최소재고 값이 올바르지 않아 0으로 설정됩니다.`);
          item.minimum_stock_level = 0;
        }
      } else {
        item.minimum_stock_level = 0;
      }

      if (barcodeIndex >= 0 && cells[barcodeIndex]) {
        const barcode = cells[barcodeIndex];
        // 바코드 형식 검증 (단순한 길이 체크)
        if (barcode.length < 8 || barcode.length > 20) {
          result.warnings.push(`${rowNumber}행: 바코드 길이가 일반적이지 않습니다: ${barcode}`);
        }
        item.barcode = barcode;
      }

      if (!hasErrors) {
        validItems.push(item);
      }
    });

    result.summary.validRows = validItems.length;
    result.summary.imported = validItems.length;

    if (result.errors.length === 0) {
      result.success = true;
    }

    // 성공 메시지 추가
    if (result.success && result.summary.imported > 0) {
      result.warnings.unshift(`${result.summary.imported}개의 품목이 처리 준비되었습니다.`);
    }

    return result;

  } catch (error) {
    result.errors.push(`CSV 파싱 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    return result;
  }
}

export function parseItemsFromCSV(csvContent: string): any[] {
  const result = parseAndValidateItemCSV(csvContent);
  if (!result.success) {
    throw new Error(`CSV 파싱 실패: ${result.errors.join(', ')}`);
  }

  // 실제로는 이 함수에서 파싱된 아이템들을 반환해야 하지만,
  // 검증 로직이 이미 parseAndValidateItemCSV에 있으므로 
  // 실제 파싱도 같은 로직을 사용
  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const getHeaderIndex = (headerName: string) => 
    headers.findIndex(h => h.includes(headerName));

  const nameIndex = getHeaderIndex('품목명');
  const skuIndex = getHeaderIndex('SKU');
  const descriptionIndex = getHeaderIndex('설명');
  const categoryIndex = getHeaderIndex('카테고리');
  const itemTypeIndex = getHeaderIndex('유형');
  const unitIndex = getHeaderIndex('단위');
  const unitPriceIndex = getHeaderIndex('단가');
  const stockQuantityIndex = getHeaderIndex('현재재고');
  const minStockIndex = getHeaderIndex('최소재고');
  const barcodeIndex = getHeaderIndex('바코드');

  const dataLines = lines.slice(1);
  const items: any[] = [];

  dataLines.forEach(line => {
    const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
    
    if (cells.every(cell => !cell)) return;

    const item: any = {
      name: cells[nameIndex],
      sku: cells[skuIndex],
      category_name: cells[categoryIndex],
      item_type: cells[itemTypeIndex]?.toLowerCase() === '물품' ? 'product' : 
                 cells[itemTypeIndex]?.toLowerCase() === '서비스' ? 'service' : 
                 cells[itemTypeIndex]?.toLowerCase(),
      unit: cells[unitIndex],
      unit_price: parseFloat(cells[unitPriceIndex]?.replace(/[^\d.-]/g, '') || '0'),
      stock_quantity: parseInt(cells[stockQuantityIndex]?.replace(/[^\d-]/g, '') || '0'),
      minimum_stock_level: parseInt(cells[minStockIndex]?.replace(/[^\d-]/g, '') || '0')
    };

    if (descriptionIndex >= 0 && cells[descriptionIndex]) {
      item.description = cells[descriptionIndex];
    }

    if (barcodeIndex >= 0 && cells[barcodeIndex]) {
      item.barcode = cells[barcodeIndex];
    }

    items.push(item);
  });

  return items;
}