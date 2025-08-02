'use client';

import React, { memo, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Collapse,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { QuoteItem, QuoteDetail, Supplier } from '@/types/motionsense-quote';
import QuoteDetailItem from './QuoteDetailItem';

interface QuoteItemCollapsibleProps {
  item: QuoteItem;
  itemIndex: number;
  groupIndex: number;
  isExpanded: boolean;
  showCostManagement: boolean;
  suppliers: Supplier[];
  onUpdateItem: (groupIndex: number, itemIndex: number, updates: Partial<QuoteItem>) => void;
  onRemoveItem: (groupIndex: number, itemIndex: number) => void;
  onAddDetail: (groupIndex: number, itemIndex: number) => void;
  onUpdateDetail: (groupIndex: number, itemIndex: number, detailIndex: number, updates: Partial<QuoteDetail>) => void;
  onRemoveDetail: (groupIndex: number, itemIndex: number, detailIndex: number) => void;
  onToggleExpansion: (groupIndex: number, itemIndex: number) => void;
  onOpenMasterItemDialog: (groupIndex: number, itemIndex: number) => void;
}

const QuoteItemCollapsible = memo<QuoteItemCollapsibleProps>(({
  item,
  itemIndex,
  groupIndex,
  isExpanded,
  showCostManagement,
  suppliers,
  onUpdateItem,
  onRemoveItem,
  onAddDetail,
  onUpdateDetail,
  onRemoveDetail,
  onToggleExpansion,
  onOpenMasterItemDialog
}) => {
  // Memoized handlers
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateItem(groupIndex, itemIndex, { name: e.target.value });
  }, [groupIndex, itemIndex, onUpdateItem]);

  const handleAddDetail = useCallback(() => {
    onAddDetail(groupIndex, itemIndex);
  }, [groupIndex, itemIndex, onAddDetail]);

  const handleRemoveItem = useCallback(() => {
    onRemoveItem(groupIndex, itemIndex);
  }, [groupIndex, itemIndex, onRemoveItem]);

  const handleToggleExpansion = useCallback(() => {
    onToggleExpansion(groupIndex, itemIndex);
  }, [groupIndex, itemIndex, onToggleExpansion]);

  const handleOpenMasterItemDialog = useCallback(() => {
    onOpenMasterItemDialog(groupIndex, itemIndex);
  }, [groupIndex, itemIndex, onOpenMasterItemDialog]);

  // Memoized detail items to prevent unnecessary re-renders
  const detailItems = useMemo(() => {
    return item.details?.map((detail, detailIndex) => (
      <QuoteDetailItem
        key={detailIndex}
        detail={detail}
        detailIndex={detailIndex}
        groupIndex={groupIndex}
        itemIndex={itemIndex}
        showCostManagement={showCostManagement}
        suppliers={suppliers}
        onUpdate={onUpdateDetail}
        onRemove={onRemoveDetail}
      />
    )) || [];
  }, [
    item.details,
    groupIndex,
    itemIndex,
    showCostManagement,
    suppliers,
    onUpdateDetail,
    onRemoveDetail
  ]);

  return (
    <Box sx={{ 
      border: '1px solid #e0e0e0', 
      borderRadius: 1, 
      mb: 1, 
      bgcolor: 'grey.50' 
    }}>
      <Box sx={{ p: 2, pb: 1 }}>
        {/* 항목 헤더 - 모바일 최적화 */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }, 
          gap: { xs: 2, sm: 1 }
        }}>
          <TextField
            label="항목명"
            value={item.name}
            onChange={handleNameChange}
            size="small"
            sx={{ flexGrow: 1 }}
          />
          
          {/* 모바일에서는 버튼들을 별도 행으로 */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            flexWrap: { xs: 'wrap', sm: 'nowrap' }
          }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddDetail}
              size="small"
              sx={{ 
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
                minHeight: 36,
                flex: { xs: '1', sm: 'none' }
              }}
            >
              직접입력
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenMasterItemDialog}
              size="small"
              sx={{ 
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
                minHeight: 36,
                flex: { xs: '1', sm: 'none' }
              }}
            >
              품목선택
            </Button>
            <IconButton
              onClick={handleToggleExpansion}
              size="small"
              aria-label={isExpanded ? "세부 항목 접기" : "세부 항목 펼치기"}
              sx={{ minWidth: 36, minHeight: 36 }}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              onClick={handleRemoveItem}
              size="small"
              color="error"
              aria-label="항목 삭제"
              sx={{ minWidth: 36, minHeight: 36 }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        {/* 세부 항목들 */}
        <Collapse in={isExpanded}>
          <Box sx={{ mt: 2 }}>
            {item.details?.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                세부항목을 추가하세요.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {detailItems}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
});

QuoteItemCollapsible.displayName = 'QuoteItemCollapsible';

export default QuoteItemCollapsible;