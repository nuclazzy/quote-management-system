'use client';

import React from 'react';
import { Quote4TierData } from '@/types/quote-4tier';

interface QuotePDFViewProps {
  quote: Quote4TierData;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
  };
  showPrintButtons?: boolean;
}

export default function QuotePDFView({ 
  quote, 
  companyInfo = {
    name: 'MotionSense',
    address: '서울시 강남구 테헤란로 456',
    phone: '02-9876-5432',
    email: 'sales@motionsense.kr',
    taxNumber: '123-45-67890'
  },
  showPrintButtons = true 
}: QuotePDFViewProps) {
  
  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    window.print();
    setTimeout(() => {
      alert('💡 PDF 저장 방법:\n\n1. 인쇄 대화상자에서 "PDF로 저장" 선택\n2. 파일명 입력\n3. 저장 버튼 클릭');
    }, 100);
  };

  // 그룹별 합계 계산
  const calculateGroupTotal = (group: any) => {
    return group.items?.reduce((sum: number, item: any) => {
      const itemTotal = item.details?.reduce((dSum: number, detail: any) => {
        return dSum + (detail.quantity * detail.days * detail.unit_price);
      }, 0) || 0;
      return sum + itemTotal;
    }, 0) || 0;
  };

  // 항목별 합계 계산
  const calculateItemTotal = (item: any) => {
    return item.details?.reduce((sum: number, detail: any) => {
      return sum + (detail.quantity * detail.days * detail.unit_price);
    }, 0) || 0;
  };

  // 세부 항목 금액 계산
  const calculateDetailTotal = (detail: any) => {
    return detail.quantity * detail.days * detail.unit_price;
  };

  // 숫자 포맷
  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  return (
    <>
      {/* 컨트롤 버튼 */}
      {showPrintButtons && (
        <div className="print-controls no-print">
          <button className="print-btn" onClick={handlePrint}>
            🖨️ 인쇄하기
          </button>
          <button className="pdf-btn" onClick={handleSavePDF}>
            📄 PDF 저장
          </button>
        </div>
      )}

      <div className="quote-container">
        {/* 헤더 */}
        <div className="quote-header">
          <div className="header-top">
            <h1 className="quote-title">견 적 서</h1>
            <div className="company-info">
              <div className="company-name">{companyInfo.name}</div>
              <div>{companyInfo.address} | Tel: {companyInfo.phone}</div>
              <div>{companyInfo.email} | 사업자: {companyInfo.taxNumber}</div>
            </div>
          </div>
          <div className="header-info">
            <div className="quote-info">
              <div className="info-item">
                <label>견적번호:</label>
                <span>{quote.quote_number}</span>
              </div>
              <div className="info-item">
                <label>작성일:</label>
                <span>{new Date(quote.issue_date).toLocaleDateString('ko-KR')}</span>
              </div>
              <div className="info-item">
                <label>유효기한:</label>
                <span>{new Date(quote.valid_until || Date.now() + 30*24*60*60*1000).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
            <div className="info-item">
              <label>고객사:</label>
              <span className="customer-name">{quote.customer_name_snapshot}</span>
            </div>
          </div>
        </div>

        {/* 프로젝트 정보 */}
        <div className="project-section">
          <h2>{quote.project_title}</h2>
          {quote.description && <p>{quote.description}</p>}
        </div>

        {/* 견적 테이블 */}
        <table className="quote-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>수량</th>
              <th>일수</th>
              <th>단위</th>
              <th>단가</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {quote.groups?.map((group, groupIdx) => {
              const groupTotal = calculateGroupTotal(group);
              return (
                <React.Fragment key={groupIdx}>
                  {/* 그룹 헤더 */}
                  <tr className="group-header">
                    <td colSpan={5} className="group-name">
                      {groupIdx + 1}. {group.name}
                    </td>
                    <td className="group-total">{formatNumber(groupTotal)}원</td>
                  </tr>
                  
                  {/* 그룹 내 항목들 */}
                  {group.items?.map((item, itemIdx) => {
                    const itemTotal = calculateItemTotal(item);
                    return (
                      <React.Fragment key={`${groupIdx}-${itemIdx}`}>
                        {/* 항목 헤더 */}
                        <tr className="item-row">
                          <td>• {item.name}</td>
                          <td colSpan={4}></td>
                          <td className="item-total">{formatNumber(itemTotal)}원</td>
                        </tr>
                        
                        {/* 세부 항목들 */}
                        {item.details?.map((detail, detailIdx) => {
                          const detailTotal = calculateDetailTotal(detail);
                          return (
                            <tr key={`${groupIdx}-${itemIdx}-${detailIdx}`} className="detail-row">
                              <td>- {detail.name}</td>
                              <td className="text-center">{detail.quantity}</td>
                              <td className="text-center">{detail.days}</td>
                              <td className="text-center">{detail.unit}</td>
                              <td className="text-right">{formatNumber(detail.unit_price)}원</td>
                              <td className="text-right">{formatNumber(detailTotal)}원</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* 금액 요약 */}
        <div className="summary-section">
          <div className="summary-box">
            <div className="summary-row">
              <span>순 공급가액:</span>
              <span>{formatNumber(quote.subtotal || 0)}원</span>
            </div>
            <div className="summary-row">
              <span>대행수수료 ({((quote.agency_fee_rate || 0.15) * 100).toFixed(0)}%):</span>
              <span>{formatNumber(quote.agency_fee || 0)}원</span>
            </div>
            <div className="summary-row">
              <span>부가세 (10%):</span>
              <span>{formatNumber(quote.vat_amount || 0)}원</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="summary-row discount">
                <span>할인 금액:</span>
                <span>-{formatNumber(quote.discount_amount)}원</span>
              </div>
            )}
            <div className="summary-row total">
              <span>최종 견적가:</span>
              <span>{formatNumber(quote.final_total || 0)}원</span>
            </div>
          </div>
        </div>

        {/* 조건 및 참고사항 */}
        <div className="terms-section">
          <h3>조건 및 참고사항</h3>
          <ul className="terms-list">
            <li>본 견적서의 유효기간은 작성일로부터 30일입니다.</li>
            <li>부가가치세는 별도입니다.</li>
            <li>작업 범위 변경 시 추가 비용이 발생할 수 있습니다.</li>
            <li>계약금(30%), 중도금(30%), 잔금(40%) 분할 납부.</li>
            <li>프로젝트 시작 후 취소 시 진행 비용 청구됩니다.</li>
            <li>유지보수 계약은 별도 협의가 필요합니다.</li>
            <li>제안된 일정은 요구사항에 따라 조정될 수 있습니다.</li>
            <li>산출물의 저작권은 완납 후 이전됩니다.</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .print-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }

        .print-btn, .pdf-btn {
          padding: 10px 20px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transition: all 0.3s;
        }

        .pdf-btn {
          background: #d32f2f;
        }

        .print-btn:hover {
          background: #1565c0;
        }

        .pdf-btn:hover {
          background: #c62828;
        }

        .quote-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          padding: 15mm;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
          font-size: 11px;
          line-height: 1.2;
          color: #333;
        }

        .quote-header {
          margin-bottom: 10px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid #1976d2;
          margin-bottom: 8px;
        }

        .quote-title {
          font-size: 24px;
          font-weight: bold;
          color: #1976d2;
          letter-spacing: 3px;
          margin: 0;
        }

        .company-info {
          text-align: right;
          font-size: 9px;
          color: #666;
          line-height: 1.3;
        }

        .company-name {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          margin-bottom: 2px;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          background-color: #f5f5f5;
          border-radius: 3px;
          font-size: 10px;
        }

        .quote-info {
          display: flex;
          gap: 20px;
        }

        .info-item {
          display: flex;
          gap: 5px;
        }

        .info-item label {
          color: #666;
        }

        .info-item span {
          color: #333;
          font-weight: 600;
        }

        .customer-name {
          color: #1976d2;
          font-weight: bold;
          font-size: 11px;
        }

        .project-section {
          margin-bottom: 10px;
          padding: 8px 12px;
          background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 4px;
        }

        .project-section h2 {
          font-size: 13px;
          font-weight: bold;
          color: #1565c0;
          margin: 0 0 3px 0;
        }

        .project-section p {
          font-size: 10px;
          color: #555;
          margin: 0;
        }

        .quote-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 10px;
          border: 1px solid #ddd;
        }

        .quote-table thead {
          background: #1976d2;
          color: white;
        }

        .quote-table th {
          padding: 5px 6px;
          text-align: left;
          font-size: 10px;
          font-weight: 600;
          border-right: 1px solid rgba(255,255,255,0.2);
        }

        .quote-table th:last-child {
          border-right: none;
        }

        .quote-table th:nth-child(1) { width: 50%; }
        .quote-table th:nth-child(2) { width: 6%; text-align: center; }
        .quote-table th:nth-child(3) { width: 6%; text-align: center; }
        .quote-table th:nth-child(4) { width: 6%; text-align: center; }
        .quote-table th:nth-child(5) { width: 16%; text-align: right; }
        .quote-table th:nth-child(6) { width: 16%; text-align: right; }

        .quote-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: middle;
        }

        .group-header {
          background: #e3f2fd;
          font-weight: bold;
          font-size: 11px;
        }

        .group-header td {
          padding: 5px 6px;
          color: #1565c0;
          border-bottom: 1px solid #90caf9;
        }

        .group-total {
          text-align: right;
          font-weight: bold;
          color: #1565c0;
        }

        .item-row {
          background-color: #fafafa;
        }

        .item-row td:first-child {
          padding-left: 20px;
          font-weight: 600;
          color: #424242;
          font-size: 10px;
        }

        .item-total {
          text-align: right;
          font-weight: 600;
          color: #424242;
        }

        .detail-row td:first-child {
          padding-left: 35px;
          color: #666;
          font-size: 9px;
        }

        .detail-row td {
          padding: 3px 6px;
          font-size: 9px;
        }

        .text-center {
          text-align: center !important;
        }

        .text-right {
          text-align: right !important;
        }

        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .summary-box {
          width: 280px;
          background: #f8f9fa;
          border: 2px solid #1976d2;
          border-radius: 5px;
          padding: 10px 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10px;
          padding: 2px 0;
        }

        .summary-row.discount {
          color: #d32f2f;
        }

        .summary-row.total {
          font-size: 13px;
          font-weight: bold;
          color: #1976d2;
          padding-top: 6px;
          border-top: 1px solid #1976d2;
          margin-top: 6px;
        }

        .terms-section {
          padding: 10px 12px;
          background: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 4px;
          margin-top: auto;
        }

        .terms-section h3 {
          font-size: 11px;
          font-weight: bold;
          margin: 0 0 6px 0;
          color: #e65100;
        }

        .terms-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 15px;
          font-size: 9px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .terms-list li {
          padding-left: 12px;
          position: relative;
          line-height: 1.3;
        }

        .terms-list li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #e65100;
        }

        @media print {
          body {
            background: white;
            font-size: 9pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .quote-container {
            width: 100%;
            height: auto;
            box-shadow: none;
            margin: 0;
            padding: 10mm 15mm;
            page-break-after: avoid;
          }

          .quote-table {
            page-break-inside: avoid;
          }

          .terms-section {
            page-break-inside: avoid;
          }

          .group-header {
            background: #e3f2fd !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          thead {
            background: #1976d2 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .project-section {
            background: linear-gradient(90deg, #e3f2fd 0%, #bbdefb 100%) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </>
  );
}