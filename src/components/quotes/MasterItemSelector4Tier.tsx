'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  Alert,
  Skeleton,
  InputAdornment,
  IconButton,
  Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  PhotoCamera as SnapshotIcon
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/utils/format';
import type { MasterItem } from '@/types/quote-4tier';

interface MasterItemSelector4TierProps {
  open: boolean;
  onClose: () => void;
  onSelect: (masterItemId: string, quantity?: number, days?: number) => Promise<void>;
  groupIndex: number;
  itemIndex: number;
}

interface MasterItemWithSupplier extends MasterItem {
  supplier?: {
    id: string;
    name: string;
  } | null;
  categories?: {
    id: string;
    name: string;
  } | null;
}

export default function MasterItemSelector4Tier({
  open,
  onClose,
  onSelect,
  groupIndex,
  itemIndex
}: MasterItemSelector4TierProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [masterItems, setMasterItems] = useState<MasterItemWithSupplier[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedDays, setSelectedDays] = useState(1);

  // 카테고리 목록 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('type', 'item')
          .order('name');
        
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('카테고리 로드 실패:', err);
      }
    };
    
    if (open) {
      loadCategories();
    }
  }, [open]);

  // 마스터 품목 검색
  const searchMasterItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('items')
        .select(`
          *,
          supplier:suppliers(id, name),
          categories(id, name)
        `)
        .eq('is_active', true);

      // 검색어 필터
      if (searchTerm.trim()) {
        query = query.or(
          `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      // 카테고리 필터
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      query = query.order('name').limit(50);

      const { data, error } = await query;

      if (error) throw error;
      setMasterItems(data || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '마스터 품목 검색에 실패했습니다.');
      setMasterItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  // 검색 실행
  useEffect(() => {
    if (open) {
      const timer = setTimeout(searchMasterItems, 300);
      return () => clearTimeout(timer);
    }
  }, [open, searchMasterItems]);

  // 마스터 품목 선택 및 스냅샷 생성
  const handleSelectItem = useCallback(async (masterItem: MasterItemWithSupplier) => {
    try {
      setLoading(true);
      await onSelect(masterItem.id, selectedQuantity, selectedDays);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : '품목 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onSelect, selectedQuantity, selectedDays, onClose]);

  const handleClose = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory(null);
    setMasterItems([]);
    setError(null);
    setSelectedQuantity(1);
    setSelectedDays(1);
    onClose();
  }, [onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SnapshotIcon color="primary" />
          <Typography variant="h6" component="span">
            마스터 품목 선택 (스냅샷 생성)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          선택한 마스터 품목의 현재 정보가 견적서에 스냅샷으로 저장됩니다.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="품목명 또는 설명으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.find(c => c.id === selectedCategory) || null}
                onChange={(_, value) => setSelectedCategory(value?.id || null)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="카테고리 선택"
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="기본 수량"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="기본 일수"
                value={selectedDays}
                onChange={(e) => setSelectedDays(Math.max(1, parseFloat(e.target.value) || 1))}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>스냅샷 원리:</strong> 견적서에 품목을 추가하는 순간, 해당 품목의 이름, 단가, 설명 등 모든 정보를 
          사진을 찍듯이 그대로 복사하여 quote_details 테이블에 저장합니다. 
          나중에 마스터 품목 정보가 변경되더라도 견적서의 내용은 변경되지 않습니다.
        </Alert>

        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>품목명</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>공급업체</TableCell>
                <TableCell align="right">단가</TableCell>
                <TableCell align="right">원가</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !masterItems.length ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : masterItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      {searchTerm || selectedCategory ? '검색 결과가 없습니다.' : '마스터 품목을 검색해주세요.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                masterItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSelectItem(item)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {item.categories && (
                        <Chip 
                          label={item.categories.name} 
                          size="small" 
                          variant="outlined" 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.supplier?.name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(item.unit_price || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(item.cost_price || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectItem(item);
                        }}
                        disabled={loading}
                      >
                        스냅샷 추가
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {masterItems.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {masterItems.length}개의 품목 (최대 50개까지 표시)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              행을 클릭하거나 "스냅샷 추가" 버튼을 눌러 선택하세요
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}