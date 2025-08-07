'use client';

import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Grid,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Search as SearchIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { QuoteTemplate } from '@/types/motionsense-quote';
import { QuoteTemplatesService } from '@/lib/services/quote-templates';

interface TemplateSelectorProps {
  onApplyTemplate: (template: QuoteTemplate) => void;
}

// 템플릿 미리보기를 위한 도우미 함수
const calculateTemplatePreview = (template: QuoteTemplate) => {
  const groups = template.template_data?.groups || [];
  let totalItems = 0;
  let estimatedTotal = 0;

  const preview_groups = groups.map(group => {
    const itemCount = group.items?.reduce((acc, item) => acc + (item.details?.length || 0), 0) || 0;
    totalItems += itemCount;
    
    // 간단한 예상 금액 계산 (실제로는 더 복잡한 로직이 필요)
    const groupEstimate = group.items?.reduce((acc, item) => 
      acc + (item.details?.reduce((detailAcc, detail) => 
        detailAcc + (detail.quantity * detail.days * detail.unit_price), 0) || 0), 0) || 0;
    estimatedTotal += groupEstimate;

    return {
      name: group.name,
      item_count: itemCount
    };
  });

  return {
    preview_groups,
    estimated_total: estimatedTotal
  };
};

export default function TemplateSelector({ onApplyTemplate }: TemplateSelectorProps) {
  const theme = useTheme();
  
  // 상태 관리
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // API 데이터 로딩
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await QuoteTemplatesService.getAll({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        is_active: true,
        limit: 100, // 템플릿은 많지 않으므로 한 번에 로드
      });

      setTemplates(response.data);
    } catch (err) {
      console.warn('템플릿 로딩 실패 - 임시로 무시:', err);
      // 템플릿 테이블이 없어도 페이지가 작동하도록 에러를 무시
      setTemplates([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 목록 로딩
  const loadCategories = async () => {
    try {
      const categoryList = await QuoteTemplatesService.getCategories();
      setCategories(categoryList);
    } catch (err) {
      console.warn('템플릿 카테고리 로딩 실패 - 임시로 무시:', err);
      // 템플릿 테이블이 없어도 페이지가 작동하도록 에러를 무시
      setCategories([]);
    }
  };

  // 컴포넌트 마운트 시 데이터 로딩
  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  // 검색어나 카테고리 변경 시 데이터 다시 로딩
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTemplates();
    }, 300); // 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory]);

  const handleTemplateSelect = (template: QuoteTemplate) => {
    setSelectedTemplate(template);
    setConfirmDialog(true);
  };

  const handleConfirmApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
    }
    setConfirmDialog(false);
    setSelectedTemplate(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '영상제작': return 'primary';
      case '촬영': return 'secondary';
      case '그래픽디자인': return 'success';
      case '개발': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          견적서 템플릿 선택
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          미리 구성된 템플릿을 선택하여 빠르게 견적서를 작성하세요.
        </Typography>

        {/* 검색 및 필터 섹션 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              placeholder="템플릿명, 설명으로 검색..."
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
                onChange={(e) => setSelectedCategory(e.target.value)}
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
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 데이터가 없는 경우 */}
        {!loading && templates.length === 0 && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm || selectedCategory ? '검색 결과가 없습니다.' : '템플릿이 없습니다.'}
            </Typography>
          </Box>
        )}

        {/* 템플릿 그리드 */}
        {templates.length > 0 && (
          <Grid container spacing={2}>
            {templates.map((template) => {
              const preview = calculateTemplatePreview(template);
              return (
                <Grid item xs={12} sm={6} lg={3} key={template.id}>
                  <Box
                    sx={{ 
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      bgcolor: 'white',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main'
                    },
                    height: '100%', // 카드 높이 통일
                    minHeight: { xs: 'auto', sm: 280 }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <Box sx={{ p: { xs: 2, sm: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      mb: 1,
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1, sm: 0 }
                    }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '0.875rem' } }}>
                        {template.name}
                      </Typography>
                      <Chip 
                        label={template.category} 
                        size="small" 
                        color={getCategoryColor(template.category) as any}
                        variant="outlined"
                        sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 2, 
                      minHeight: { xs: 'auto', sm: 40 },
                      fontSize: { xs: '0.875rem', sm: '0.875rem' },
                      flex: { xs: 'none', sm: '0 1 auto' }
                    }}>
                      {template.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2, flex: { xs: 'none', sm: '1 0 auto' } }}>
                      {preview.preview_groups.map((group, index) => (
                        <Typography key={index} variant="caption" display="block" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                          • {group.name} ({group.item_count}개 항목)
                        </Typography>
                      ))}
                    </Box>
                    
                    <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ 
                      fontSize: { xs: '0.875rem', sm: '0.875rem' },
                      mt: 'auto' // 하단에 고정
                    }}>
                      예상 금액: {preview.estimated_total.toLocaleString()}원
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* 템플릿 적용 확인 다이얼로그 */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>
          템플릿 적용 확인
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            <strong>{selectedTemplate?.name}</strong> 템플릿을 적용하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            현재 작성 중인 내용이 있다면 템플릿으로 대체됩니다.
          </Typography>
          
          {selectedTemplate && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                포함될 그룹:
              </Typography>
              {selectedTemplate && calculateTemplatePreview(selectedTemplate).preview_groups.map((group, index) => (
                <Typography key={index} variant="body2">
                  • {group.name} ({group.item_count}개 항목)
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog(false)}
            sx={{ 
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleConfirmApply} 
            variant="contained"
            sx={{ 
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            적용하기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}