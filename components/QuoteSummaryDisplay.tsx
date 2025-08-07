import React from 'react';
import { Box, Typography, Divider, Collapse, IconButton, Chip } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface QuoteSummaryProps {
  formData: any;
  calculation: any;
}

export default function QuoteSummaryDisplay({ formData, calculation }: QuoteSummaryProps) {
  const [expanded, setExpanded] = React.useState({
    groups: false,
    fees: true
  });

  // 대행수수료 적용 그룹 목록 생성
  const feeAppliedGroups = formData?.groups?.filter((group: any) => group.include_in_fee) || [];

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      {/* 그룹별 소계 (접기/펼치기 가능) */}
      <Box sx={{ mb: 2 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            p: 1,
            borderRadius: 1
          }}
          onClick={() => setExpanded(prev => ({ ...prev, groups: !prev.groups }))}
        >
          <Typography variant="subtitle2" color="text.secondary">
            항목별 내역
          </Typography>
          <IconButton size="small">
            {expanded.groups ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Collapse in={expanded.groups}>
          {formData?.groups?.map((group: any, index: number) => {
            const groupTotal = group.items?.reduce((sum: number, item: any) => {
              const itemTotal = item.details?.reduce((dSum: number, detail: any) => {
                return dSum + (detail.quantity * detail.days * detail.unit_price);
              }, 0) || 0;
              return sum + itemTotal;
            }, 0) || 0;

            const groupName = group.name || `그룹 ${index + 1}`;

            return (
              <Box key={index} sx={{ pl: 2, pr: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {groupName} 합계
                    </Typography>
                    {group.include_in_fee && (
                      <Chip label="수수료 적용" size="small" color="info" sx={{ height: 18, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {groupTotal.toLocaleString()}원
                  </Typography>
                </Box>
                
                {/* 항목별 소계 (더 작은 글씨로) */}
                {group.items?.map((item: any, itemIndex: number) => {
                  const itemTotal = item.details?.reduce((sum: number, detail: any) => {
                    return sum + (detail.quantity * detail.days * detail.unit_price);
                  }, 0) || 0;
                  
                  const itemName = item.name || `항목 ${itemIndex + 1}`;
                  
                  return (
                    <Box key={itemIndex} sx={{ pl: 2, display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" color="text.disabled">
                        └ {itemName} 합계
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {itemTotal.toLocaleString()}원
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Collapse>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* 순 공급가액 (전체 소계) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body1" fontWeight="medium">
          순 공급가액
        </Typography>
        <Typography variant="body1" fontWeight="medium">
          {(calculation?.subtotal || 0).toLocaleString()}원
        </Typography>
      </Box>

      {/* 수수료 및 세금 */}
      <Box sx={{ pl: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              대행수수료 ({((formData?.agency_fee_rate || 0) * 100).toFixed(1)}%)
            </Typography>
            {feeAppliedGroups.length > 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
                적용: {feeAppliedGroups.map((g: any) => g.name || '미지정').join(', ')}
              </Typography>
            )}
          </Box>
          <Typography variant="body2">
            +{(calculation?.agency_fee || 0).toLocaleString()}원
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            부가세 (10%)
          </Typography>
          <Typography variant="body2">
            +{(calculation?.vat_amount || 0).toLocaleString()}원
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          공급가 합계
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {((calculation?.subtotal || 0) + (calculation?.agency_fee || 0) + (calculation?.vat_amount || 0)).toLocaleString()}원
        </Typography>
      </Box>

      {/* 할인 */}
      {calculation?.discount_amount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="error">
            할인 금액
          </Typography>
          <Typography variant="body2" color="error">
            -{(calculation?.discount_amount || 0).toLocaleString()}원
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 1 }} />

      {/* 최종 금액 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          최종 견적가
        </Typography>
        <Typography variant="h6" color="primary" fontWeight="bold">
          {(calculation?.final_total || 0).toLocaleString()}원
        </Typography>
      </Box>

      {/* 원가 관리 모드일 때 수익 분석 */}
      {formData?.show_cost_management && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            수익 분석
          </Typography>
          <Box sx={{ pl: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                총 원가
              </Typography>
              <Typography variant="body2">
                {(calculation?.total_cost || 0).toLocaleString()}원
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                순이익
              </Typography>
              <Typography variant="body2" color="success.main">
                {(calculation?.total_profit || 0).toLocaleString()}원
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                이익률
              </Typography>
              <Typography variant="body2" color="success.main">
                {(calculation?.profit_margin_percentage || 0).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}