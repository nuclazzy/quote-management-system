'use client';

import React, { memo, useCallback } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box,
  IconButton,
  Autocomplete
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { QuoteDetail, Supplier } from '@/types/motionsense-quote';

interface QuoteDetailItemProps {
  detail: QuoteDetail;
  detailIndex: number;
  groupIndex: number;
  itemIndex: number;
  showCostManagement: boolean;
  suppliers: Supplier[];
  onUpdate: (groupIndex: number, itemIndex: number, detailIndex: number, updates: Partial<QuoteDetail>) => void;
  onRemove: (groupIndex: number, itemIndex: number, detailIndex: number) => void;
}

const QuoteDetailItem = memo<QuoteDetailItemProps>(({
  detail,
  detailIndex,
  groupIndex,
  itemIndex,
  showCostManagement,
  suppliers,
  onUpdate,
  onRemove
}) => {
  // Memoized handlers to prevent unnecessary re-renders
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { name: e.target.value });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { quantity: Number(e.target.value) || 0 });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { days: Number(e.target.value) || 0 });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { unit: e.target.value });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleUnitPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { unit_price: Number(e.target.value) || 0 });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleCostPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(groupIndex, itemIndex, detailIndex, { cost_price: Number(e.target.value) || 0 });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleSupplierChange = useCallback((event: any, newValue: Supplier | null) => {
    onUpdate(groupIndex, itemIndex, detailIndex, {
      supplier_id: newValue?.id,
      supplier_name_snapshot: newValue?.name || ''
    });
  }, [groupIndex, itemIndex, detailIndex, onUpdate]);

  const handleRemove = useCallback(() => {
    onRemove(groupIndex, itemIndex, detailIndex);
  }, [groupIndex, itemIndex, detailIndex, onRemove]);

  // Memoized calculation to prevent unnecessary recalculations
  const totalPrice = React.useMemo(() => {
    return detail.quantity * detail.days * detail.unit_price;
  }, [detail.quantity, detail.days, detail.unit_price]);

  const selectedSupplier = React.useMemo(() => {
    return suppliers.find(s => s.id === detail.supplier_id) || null;
  }, [suppliers, detail.supplier_id]);

  return (
    <Box sx={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: 1, 
      bgcolor: 'white',
      p: 2
    }}>
      <Grid container spacing={2} alignItems="center">
        {/* 품목명 - 전체 너비 */}
        <Grid item xs={12}>
          <TextField
            label="품목명"
            value={detail.name}
            onChange={handleNameChange}
            size="small"
            fullWidth
            placeholder="품목명 입력"
          />
        </Grid>
        
        {/* 첫 번째 행: 수량, 일수, 단위 - 모바일 최적화 */}
        <Grid item xs={6} sm={4}>
          <TextField
            label="수량"
            type="number"
            value={detail.quantity}
            onChange={handleQuantityChange}
            size="small"
            fullWidth
            inputProps={{ 
              min: 0, 
              step: 0.1,
              inputMode: 'decimal'
            }}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField
            label="일수"
            type="number"
            value={detail.days}
            onChange={handleDaysChange}
            size="small"
            fullWidth
            inputProps={{ 
              min: 0, 
              step: 0.5,
              inputMode: 'decimal'
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="단위"
            value={detail.unit}
            onChange={handleUnitChange}
            size="small"
            fullWidth
            placeholder="개"
          />
        </Grid>
        
        {/* 두 번째 행: 단가, 원가 관리 정보 - 모바일 최적화 */}
        <Grid item xs={12} sm={showCostManagement ? 6 : 12}>
          <TextField
            label="단가"
            type="number"
            value={detail.unit_price}
            onChange={handleUnitPriceChange}
            size="small"
            fullWidth
            inputProps={{ 
              min: 0, 
              step: 1000,
              inputMode: 'numeric'
            }}
          />
        </Grid>
        
        {showCostManagement && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="원가"
              type="number"
              value={detail.cost_price || 0}
              onChange={handleCostPriceChange}
              size="small"
              fullWidth
              inputProps={{ 
                min: 0, 
                step: 1000,
                inputMode: 'numeric'
              }}
            />
          </Grid>
        )}
        
        {/* 공급업체 (원가 관리 모드에서만) */}
        {showCostManagement && (
          <Grid item xs={12}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(option) => option.name}
              value={selectedSupplier}
              onChange={handleSupplierChange}
              size="small"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="공급업체"
                  placeholder="공급업체 선택"
                  size="small"
                />
              )}
            />
          </Grid>
        )}
        
        {/* 하단: 합계와 삭제 버튼 */}
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              합계:
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="primary">
              {totalPrice.toLocaleString()}원
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              onClick={handleRemove}
              size="small"
              color="error"
              aria-label="세부 항목 삭제"
              sx={{
                border: '1px solid',
                borderColor: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white'
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
});

QuoteDetailItem.displayName = 'QuoteDetailItem';

export default QuoteDetailItem;