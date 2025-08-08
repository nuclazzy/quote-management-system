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
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';

// 간소화된 품목 타입
interface SimpleItem {
  id: string;
  name: string;
  unit_price: number;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface MasterItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: SimpleItem) => void;
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
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 직접 Supabase 연동으로 품목 데이터 로딩
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔥 품목 선택: 직접 Supabase 연동으로 데이터 로딩');
      const supabase = createClient();
      
      let query = supabase
        .from('items')
        .select('id, name, unit_price, unit, description, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      // 검색어가 있으면 필터링
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      const { data, error: queryError } = await query.limit(100);
      
      if (queryError) {
        throw queryError;
      }
      
      console.log('✅ 품목 선택: 직접 연동 데이터 로딩 성공', data?.length);
      setItems(data || []);
    } catch (err) {
      console.error('품목 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '품목을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 다이얼로그가 열릴 때 데이터 로딩
  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  // 검색어 변경 시 데이터 다시 로딩
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => {
        loadItems();
      }, 300); // 디바운싱

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  const handleSelect = (item: SimpleItem) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
  };

  const handleClose = () => {
    onClose();
    setSearchTerm('');
    setItems([]);
    setError(null);
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
        품목 선택
      </DialogTitle>
      <DialogContent>
        {/* 검색 섹션 */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="품목명, 설명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* 오류 메시지 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 로딩 중 */}
        {loading && items.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 데이터가 없는 경우 */}
        {!loading && items.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
            </Typography>
          </Box>
        )}

        {/* 품목 테이블 */}
        {items.length > 0 && (
          <TableContainer 
            component={Paper} 
            sx={{ 
              maxHeight: { xs: 'calc(100vh - 300px)', sm: 400 }, // 모바일에서 높이 조정
              boxShadow: 'none', 
              border: '1px solid #e0e0e0',
              overflowX: 'auto' // 가로 스크롤 허용
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: { xs: 500, sm: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 'auto' } }}>품목명</TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, sm: 'auto' }, display: { xs: 'none', sm: 'table-cell' } }}>설명</TableCell>
                  <TableCell align="center" sx={{ minWidth: { xs: 60, sm: 'auto' } }}>단위</TableCell>
                  <TableCell align="right" sx={{ minWidth: { xs: 80, sm: 'auto' } }}>단가</TableCell>
                  <TableCell align="center" sx={{ minWidth: { xs: 60, sm: 'auto' } }}>선택</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {item.unit_price.toLocaleString()}원
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