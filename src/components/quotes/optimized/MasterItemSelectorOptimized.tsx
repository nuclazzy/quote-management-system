'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  InputAdornment,
  Chip,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { MasterItem } from '@/types/motionsense-quote';
import { useDebounce } from '@/hooks/useDebounce';
import { useApiCache } from '@/hooks/useApiCache';
import VirtualizedList from './VirtualizedList';
import PerformanceProfiler from '@/components/common/PerformanceProfiler';

interface MasterItemSelectorOptimizedProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MasterItem) => void;
}

// 마스터 아이템 카드 컴포넌트 - 메모화
const MasterItemCard = memo<{
  item: MasterItem;
  onSelect: (item: MasterItem) => void;
}>(({ item, onSelect }) => {
  const handleSelect = useCallback(() => {
    onSelect(item);
  }, [item, onSelect]);

  return (
    <Card
      sx={{
        mb: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: 'action.hover',
          transform: 'translateY(-1px)',
          boxShadow: 2
        }
      }}
      onClick={handleSelect}
    >
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontSize: '1rem', mb: 1 }}>
          {item.name}
        </Typography>
        
        {item.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {item.description}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label={item.category}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${item.default_unit_price?.toLocaleString() || 0}원/${item.default_unit}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  );
});

MasterItemCard.displayName = 'MasterItemCard';

const MasterItemSelectorOptimized: React.FC<MasterItemSelectorOptimizedProps> = ({
  open,
  onClose,
  onSelect
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  
  // 디바운스된 검색어
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // API 캐시를 사용한 데이터 페칭
  const {
    data: masterItems = [],
    isLoading,
    error,
    refetch
  } = useApiCache(
    `master-items-${debouncedSearchTerm}-${selectedCategory}-${priceRange}`,
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (priceRange !== 'all') params.append('price_range', priceRange);
      
      const response = await fetch(`/api/master-items?${params.toString()}`);
      if (!response.ok) {
        throw new Error('마스터 아이템을 불러오는데 실패했습니다.');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    {
      staleTime: 5 * 60 * 1000, // 5분간 fresh
      cacheTime: 10 * 60 * 1000 // 10분간 캐시 보존
    }
  );

  // 카테고리 목록 (메모화)
  const categories = useMemo(() => {
    const categorySet = new Set(masterItems.map(item => item.category));
    return Array.from(categorySet).sort();
  }, [masterItems]);

  // 필터링된 아이템들 (메모화)
  const filteredItems = useMemo(() => {
    return masterItems.filter(item => {
      // 검색어 필터링 (이미 API에서 처리되지만 클라이언트 사이드 추가 필터링)
      const matchesSearch = !debouncedSearchTerm || 
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      // 카테고리 필터링
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // 가격 범위 필터링
      let matchesPrice = true;
      if (priceRange !== 'all') {
        const price = item.default_unit_price || 0;
        switch (priceRange) {
          case 'low':
            matchesPrice = price < 100000;
            break;
          case 'medium':
            matchesPrice = price >= 100000 && price < 500000;
            break;
          case 'high':
            matchesPrice = price >= 500000;
            break;
        }
      }

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [masterItems, debouncedSearchTerm, selectedCategory, priceRange]);

  // 이벤트 핸들러들 (메모화)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e: any) => {
    setSelectedCategory(e.target.value);
  }, []);

  const handlePriceRangeChange = useCallback((e: any) => {
    setPriceRange(e.target.value);
  }, []);

  const handleItemSelect = useCallback((item: MasterItem) => {
    onSelect(item);
    onClose();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 가상화를 위한 아이템 렌더러 (메모화)
  const renderItem = useCallback((item: MasterItem, index: number) => (
    <Box key={item.id || index} sx={{ p: 1 }}>
      <MasterItemCard item={item} onSelect={handleItemSelect} />
    </Box>
  ), [handleItemSelect]);

  return (
    <PerformanceProfiler id="MasterItemSelector">
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            height: isMobile ? '100%' : '80vh',
            maxHeight: isMobile ? '100%' : '80vh'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">마스터 품목 선택</Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredItems.length}개의 품목이 검색되었습니다.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {/* 검색 및 필터 영역 */}
          <Box sx={{ mb: 3 }}>
            {/* 검색창 */}
            <TextField
              fullWidth
              placeholder="품목명으로 검색..."
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            {/* 필터 영역 */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="카테고리"
                >
                  <MenuItem value="all">전체</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>가격대</InputLabel>
                <Select
                  value={priceRange}
                  onChange={handlePriceRangeChange}
                  label="가격대"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="low">10만원 미만</MenuItem>
                  <MenuItem value="medium">10만원~50만원</MenuItem>
                  <MenuItem value="high">50만원 이상</MenuItem>
                </Select>
              </FormControl>

              {(searchTerm || selectedCategory !== 'all' || priceRange !== 'all') && (
                <Button
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setPriceRange('all');
                  }}
                >
                  필터 초기화
                </Button>
              )}
            </Box>
          </Box>

          {/* 결과 영역 */}
          <Box sx={{ height: isMobile ? 'calc(100vh - 280px)' : '400px' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" action={
                <Button size="small" onClick={refetch}>
                  재시도
                </Button>
              }>
                {error.message}
              </Alert>
            ) : filteredItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  검색 결과가 없습니다.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  다른 검색어나 필터를 시도해보세요.
                </Typography>
              </Box>
            ) : (
              <VirtualizedList
                items={filteredItems}
                height={isMobile ? window.innerHeight - 280 : 400}
                itemHeight={120}
                renderItem={renderItem}
                overscan={5}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </PerformanceProfiler>
  );
};

export default MasterItemSelectorOptimized;