'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  MenuItem
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { MasterItem } from '@/types/motionsense-quote';
import { MasterItemsService } from '@/lib/services/master-items';

interface MasterItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MasterItem) => void;
}

export default function MasterItemSelector({ 
  open, 
  onClose, 
  onSelect
}: MasterItemSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 상태 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // API 데이터 로딩
  const loadMasterItems = async (resetData = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = resetData ? 1 : page;
      const response = await MasterItemsService.getAll({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        is_active: true,
        page: currentPage,
        limit: 20,
      });

      if (resetData) {
        setMasterItems(response.data);
        setPage(1);
      } else {
        setMasterItems(prev => [...prev, ...response.data]);
      }

      setHasMore(response.pagination?.hasNextPage || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '마스터 품목을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 목록 로딩
  const loadCategories = async () => {
    try {
      const categoryList = await MasterItemsService.getCategories();
      setCategories(categoryList);
    } catch (err) {
      console.error('카테고리 로딩 중 오류:', err);
    }
  };

  // 다이얼로그가 열릴 때 데이터 로딩
  useEffect(() => {
    if (open) {
      loadMasterItems(true);
      loadCategories();
    }
  }, [open]);

  // 검색어나 카테고리 변경 시 데이터 다시 로딩
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => {
        loadMasterItems(true);
      }, 300); // 디바운싱

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, selectedCategory]);

  const handleSelect = (item: MasterItem) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
  };

  const handleClose = () => {
    onClose();
    setSearchTerm('');
    setSelectedCategory('');
    setMasterItems([]);
    setPage(1);
    setError(null);
  };

  // 더 많은 데이터 로드
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadMasterItems(false);
    }
  };

  // 카테고리 변경 핸들러
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile} // 모바일에서는 전체 화면
    >
      <DialogTitle>
        마스터 품목 선택
      </DialogTitle>
      <DialogContent>
        {/* 검색 및 필터 섹션 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              flex={1}
              placeholder="품목명, 설명, 카테고리로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                label="카테고리"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="">전체</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* 오류 메시지 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 로딩 중 */}
        {loading && masterItems.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 데이터가 없는 경우 */}
        {!loading && masterItems.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm || selectedCategory ? '검색 결과가 없습니다.' : '마스터 품목이 없습니다.'}
            </Typography>
          </Box>
        )}

        {/* 마스터 품목 테이블 */}
        {masterItems.length > 0 && (
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: { xs: 'calc(100vh - 300px)', sm: 400 }, // 모바일에서 높이 조정
              boxShadow: 'none', 
              border: '1px solid #e0e0e0',
              overflowX: 'auto' // 가로 스크롤 허용
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 'auto' } }}>품목명</TableCell>
                  <TableCell sx={{ minWidth: { xs: 80, sm: 'auto' } }}>카테고리</TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 'auto' }, display: { xs: 'none', sm: 'table-cell' } }}>설명</TableCell>
                  <TableCell align="center" sx={{ minWidth: { xs: 60, sm: 'auto' } }}>단위</TableCell>
                  <TableCell align="right" sx={{ minWidth: { xs: 80, sm: 'auto' } }}>기본단가</TableCell>
                  <TableCell align="center" sx={{ minWidth: { xs: 60, sm: 'auto' } }}>선택</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masterItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.category} 
                        size="small" 
                        variant="outlined"
                        color={
                          item.category.includes('편집') ? 'primary' :
                          item.category.includes('제작') ? 'secondary' :
                          item.category.includes('촬영') ? 'success' : 'default'
                        }
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.default_unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.default_unit_price.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSelect(item)}
                        sx={{ 
                          bgcolor: 'primary.main',
                          '&:hover': { bgcolor: 'primary.dark' },
                          boxShadow: 'none',
                          '&:hover': { boxShadow: 'none' },
                          minHeight: { xs: 32, sm: 36 }, // 모바일에서 터치 타겟 크기
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          px: { xs: 1, sm: 2 }
                        }}
                      >
                        선택
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* 더 보기 버튼 */}
            {hasMore && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : null}
                  sx={{ 
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' }
                  }}
                >
                  {loading ? '로딩 중...' : '더 보기'}
                </Button>
              </Box>
            )}
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          sx={{ 
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' }
          }}
        >
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}