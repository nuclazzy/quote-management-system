'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Button,
  Grid,
} from '@mui/material';
import { Print as PrintIcon, ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

// 샘플 견적서 데이터
const sampleQuote = {
  quote_number: 'QT-2025-0001',
  title: '모션센스 웹사이트 개발 프로젝트',
  description: '반응형 웹사이트 개발 및 관리 시스템 구축',
  created_at: new Date().toISOString(),
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  customer: {
    name: '(주)모션센스',
    contact_person: '김대표',
    phone: '02-1234-5678',
    email: 'info@motionsense.co.kr',
    address: '서울시 강남구 테헤란로 123',
  },
  groups: [
    {
      name: '기획 및 디자인',
      items: [
        {
          name: 'UI/UX 설계',
          details: [
            { name: '와이어프레임 제작', quantity: 1, days: 5, unit: '식', unit_price: 500000 },
            { name: '프로토타입 제작', quantity: 1, days: 3, unit: '식', unit_price: 300000 },
          ],
        },
        {
          name: '디자인',
          details: [
            { name: '메인 페이지 디자인', quantity: 1, days: 3, unit: '페이지', unit_price: 800000 },
            { name: '서브 페이지 디자인', quantity: 5, days: 2, unit: '페이지', unit_price: 400000 },
          ],
        },
      ],
    },
    {
      name: '개발',
      items: [
        {
          name: '프론트엔드 개발',
          details: [
            { name: 'React 컴포넌트 개발', quantity: 1, days: 10, unit: '식', unit_price: 800000 },
            { name: '반응형 처리', quantity: 1, days: 3, unit: '식', unit_price: 300000 },
          ],
        },
        {
          name: '백엔드 개발',
          details: [
            { name: 'API 서버 구축', quantity: 1, days: 7, unit: '식', unit_price: 700000 },
            { name: '데이터베이스 설계', quantity: 1, days: 3, unit: '식', unit_price: 400000 },
          ],
        },
      ],
    },
  ],
  subtotal: 15900000,
  agency_fee: 2385000,
  vat_amount: 1828500,
  discount_amount: 500000,
  final_total: 19613500,
};

export default function QuotePreviewPage() {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  const calculateItemTotal = (details: any[]) => {
    return details.reduce((sum, detail) => 
      sum + (detail.quantity * detail.days * detail.unit_price), 0
    );
  };

  const calculateGroupTotal = (items: any[]) => {
    return items.reduce((sum, item) => 
      sum + calculateItemTotal(item.details), 0
    );
  };

  return (
    <>
      {/* 인쇄 시 숨김 */}
      <Box className="no-print" sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          돌아가기
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          인쇄하기
        </Button>
      </Box>

      {/* 견적서 본문 */}
      <Paper 
        sx={{ 
          p: 4, 
          maxWidth: '210mm', 
          margin: 'auto',
          '@media print': {
            boxShadow: 'none',
            p: 0,
          }
        }}
      >
        {/* 헤더 */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              견 적 서
            </Typography>
            <Typography variant="body2" color="text.secondary">
              견적번호: {sampleQuote.quote_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              작성일: {new Date(sampleQuote.created_at).toLocaleDateString('ko-KR')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              유효기한: {new Date(sampleQuote.valid_until).toLocaleDateString('ko-KR')}
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              MotionSense
            </Typography>
            <Typography variant="body2" color="text.secondary">
              서울시 강남구 테헤란로 456
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tel: 02-9876-5432
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: sales@motionsense.kr
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        {/* 고객 정보 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>고객 정보</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>회사명:</strong> {sampleQuote.customer.name}
              </Typography>
              <Typography variant="body2">
                <strong>담당자:</strong> {sampleQuote.customer.contact_person}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>연락처:</strong> {sampleQuote.customer.phone}
              </Typography>
              <Typography variant="body2">
                <strong>이메일:</strong> {sampleQuote.customer.email}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* 프로젝트 정보 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{sampleQuote.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {sampleQuote.description}
          </Typography>
        </Box>

        {/* 견적 항목 테이블 */}
        <TableContainer sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>항목</TableCell>
                <TableCell align="center">수량</TableCell>
                <TableCell align="center">일수</TableCell>
                <TableCell align="center">단위</TableCell>
                <TableCell align="right">단가</TableCell>
                <TableCell align="right">금액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleQuote.groups.map((group, groupIdx) => (
                <>
                  {/* 그룹 헤더 */}
                  <TableRow key={`group-${groupIdx}`}>
                    <TableCell colSpan={5} sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                      {groupIdx + 1}. {group.name}
                    </TableCell>
                    <TableCell align="right" sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                      {calculateGroupTotal(group.items).toLocaleString()}원
                    </TableCell>
                  </TableRow>
                  
                  {/* 그룹 내 항목들 */}
                  {group.items.map((item, itemIdx) => (
                    <>
                      {/* 항목 헤더 */}
                      <TableRow key={`item-${groupIdx}-${itemIdx}`}>
                        <TableCell sx={{ pl: 3, fontWeight: 'medium' }}>
                          • {item.name}
                        </TableCell>
                        <TableCell colSpan={4}></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                          {calculateItemTotal(item.details).toLocaleString()}원
                        </TableCell>
                      </TableRow>
                      
                      {/* 세부 항목들 */}
                      {item.details.map((detail, detailIdx) => (
                        <TableRow key={`detail-${groupIdx}-${itemIdx}-${detailIdx}`}>
                          <TableCell sx={{ pl: 5, fontSize: '0.875rem' }}>
                            - {detail.name}
                          </TableCell>
                          <TableCell align="center">{detail.quantity}</TableCell>
                          <TableCell align="center">{detail.days}</TableCell>
                          <TableCell align="center">{detail.unit}</TableCell>
                          <TableCell align="right">
                            {detail.unit_price.toLocaleString()}원
                          </TableCell>
                          <TableCell align="right">
                            {(detail.quantity * detail.days * detail.unit_price).toLocaleString()}원
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 금액 요약 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
          <Box sx={{ width: 300 }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2">순 공급가액:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {sampleQuote.subtotal.toLocaleString()}원
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2">대행수수료 (15%):</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {sampleQuote.agency_fee.toLocaleString()}원
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2">부가세 (10%):</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {sampleQuote.vat_amount.toLocaleString()}원
                </Typography>
              </Grid>
              
              {sampleQuote.discount_amount > 0 && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="error">할인:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" color="error">
                      -{sampleQuote.discount_amount.toLocaleString()}원
                    </Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="h6">최종 견적가:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" align="right" color="primary">
                  {sampleQuote.final_total.toLocaleString()}원
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* 조건 및 참고사항 */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>조건 및 참고사항</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • 본 견적서의 유효기간은 작성일로부터 30일입니다.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • 부가가치세는 별도입니다.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • 작업 범위 변경 시 추가 비용이 발생할 수 있습니다.
          </Typography>
          <Typography variant="body2">
            • 계약금(30%), 중도금(30%), 잔금(40%)으로 분할 납부 가능합니다.
          </Typography>
        </Box>
      </Paper>

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
    </>
  );
}