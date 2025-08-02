'use client';

import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  TextField, 
  Grid, 
  Divider,
  IconButton, 
  Collapse, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Switch, 
  FormControlLabel, 
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Settings as SettingsIcon,
  Save as SaveIcon,
  PictureAsPdf as PdfIcon,
  CloudDone as CloudDoneIcon,
  CloudUpload as CloudUploadIcon,
  Warning as WarningIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSafe } from '@/hooks/useMotionsenseQuote-safe';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useFormProtection } from '@/hooks/useBeforeUnload';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { MasterItem } from '@/types/motionsense-quote';
import PerformanceProfiler from '@/components/common/PerformanceProfiler';
import QuoteItemCollapsible from '@/components/quotes/optimized/QuoteItemCollapsible';
import {
  LazyMasterItemSelector,
  LazyTemplateSelector,
  LazyWrapper,
  usePreloadComponents
} from '@/components/quotes/optimized/LazyComponents';

// 메모화된 컴포넌트들
const BasicInfoSection = memo<{
  formData: any;
  updateFormData: (updates: any) => void;
}>(({ formData, updateFormData }) => {
  const handleProjectTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ project_title: e.target.value });
  }, [updateFormData]);

  const handleCustomerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ customer_name_snapshot: e.target.value });
  }, [updateFormData]);

  const handleIssueDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ issue_date: e.target.value });
  }, [updateFormData]);

  return (
    <PerformanceProfiler id="BasicInfoSection">
      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', mb: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          기본 정보
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="프로젝트명 *"
              value={formData?.project_title || ''}
              onChange={handleProjectTitleChange}
              fullWidth
              placeholder="프로젝트명을 입력하세요"
              error={!formData?.project_title?.trim()}
              helperText={!formData?.project_title?.trim() ? '프로젝트명은 필수 입력 항목입니다.' : ''}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="고객사명"
              value={formData?.customer_name_snapshot || ''}
              onChange={handleCustomerNameChange}
              fullWidth
              placeholder="고객사명을 입력하세요"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="발행일"
              type="date"
              value={formData?.issue_date || ''}
              onChange={handleIssueDateChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Box>
    </PerformanceProfiler>
  );
});

BasicInfoSection.displayName = 'BasicInfoSection';

const AdvancedSettingsSection = memo<{
  formData: any;
  updateFormData: (updates: any) => void;
}>(({ formData, updateFormData }) => {
  const handleCostManagementChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ show_cost_management: e.target.checked });
  }, [updateFormData]);

  const handleAgencyFeeRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ agency_fee_rate: Number(e.target.value) / 100 || 0 });
  }, [updateFormData]);

  const handleDiscountAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ discount_amount: Number(e.target.value) || 0 });
  }, [updateFormData]);

  const handleVatTypeChange = useCallback((e: any) => {
    updateFormData({ vat_type: e.target.value });
  }, [updateFormData]);

  return (
    <PerformanceProfiler id="AdvancedSettingsSection">
      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', mb: 2, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            고급 설정
          </Typography>
          <IconButton size="small">
            <SettingsIcon />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData?.show_cost_management || false}
                  onChange={handleCostManagementChange}
                />
              }
              label="원가 관리 표시"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="대행 수수료율 (%)"
              type="number"
              value={(formData?.agency_fee_rate || 0) * 100}
              onChange={handleAgencyFeeRateChange}
              fullWidth
              size="small"
              inputProps={{ 
                min: 0, 
                max: 100, 
                step: 0.1,
                inputMode: 'decimal'
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="할인 금액"
              type="number"
              value={formData?.discount_amount || 0}
              onChange={handleDiscountAmountChange}
              fullWidth
              size="small"
              inputProps={{ 
                min: 0, 
                step: 1000,
                inputMode: 'numeric'
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>부가세 유형</InputLabel>
              <Select
                value={formData?.vat_type || 'exclusive'}
                label="부가세 유형"
                onChange={handleVatTypeChange}
              >
                <MenuItem value="exclusive">부가세 별도</MenuItem>
                <MenuItem value="inclusive">부가세 포함</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    </PerformanceProfiler>
  );
});

AdvancedSettingsSection.displayName = 'AdvancedSettingsSection';

const CalculationSummary = memo<{
  calculation: any;
  formData: any;
  isCalculating: boolean;
  onBackToList: () => void;
}>(({ calculation, formData, isCalculating, onBackToList }) => {
  if (isCalculating) {
    return (
      <Typography variant="body2" color="text.secondary">
        계산 중...
      </Typography>
    );
  }

  return (
    <PerformanceProfiler id="CalculationSummary">
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">소계</Typography>
          <Typography variant="body2">
            {(calculation?.subtotal || 0).toLocaleString()}원
          </Typography>
        </Box>
        
        {(calculation?.fee_applicable_amount || 0) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ∟ 대행수수료 적용 대상
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(calculation?.fee_applicable_amount || 0).toLocaleString()}원
            </Typography>
          </Box>
        )}
        
        {(calculation?.fee_excluded_amount || 0) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ∟ 대행수수료 미적용
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(calculation?.fee_excluded_amount || 0).toLocaleString()}원
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            대행수수료 ({((formData?.agency_fee_rate || 0) * 100).toFixed(1)}%)
          </Typography>
          <Typography variant="body2">
            {(calculation?.agency_fee || 0).toLocaleString()}원
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">할인</Typography>
          <Typography variant="body2" color="error">
            -{(calculation?.discount_amount || 0).toLocaleString()}원
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">부가세</Typography>
          <Typography variant="body2">
            {(calculation?.vat_amount || 0).toLocaleString()}원
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">총액</Typography>
          <Typography variant="h6" color="primary">
            {(calculation?.final_total || 0).toLocaleString()}원
          </Typography>
        </Box>

        {/* 수익 분석 */}
        {formData?.show_cost_management && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              수익 분석
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">총 원가</Typography>
              <Typography variant="body2" color="warning.main">
                {(calculation?.total_cost || 0).toLocaleString()}원
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">총 수익</Typography>
              <Typography variant="body2" color="success.main">
                {(calculation?.total_profit || 0).toLocaleString()}원
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">수익률</Typography>
              <Typography variant="body2" fontWeight="medium" color="success.main">
                {(calculation?.profit_margin_percentage || 0).toFixed(1)}%
              </Typography>
            </Box>
          </>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button 
            variant="outlined" 
            fullWidth
            onClick={onBackToList}
            sx={{ 
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            목록으로 돌아가기
          </Button>
        </Box>
      </Box>
    </PerformanceProfiler>
  );
});

CalculationSummary.displayName = 'CalculationSummary';

export default function QuoteNewPageOptimized() {
  const router = useRouter();
  const { startMeasure, endMeasure } = usePerformanceMonitor('QuoteNewPage', {
    trackMemory: true,
    logToConsole: true
  });
  
  // 컴포넌트 프리로딩
  const { preloadAll } = usePreloadComponents();
  
  // 렌더링 시작 측정
  React.useLayoutEffect(() => {
    startMeasure();
    return () => endMeasure();
  });

  // 펼침/접힘 상태 관리 (기본값: 모든 항목 펼침)
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  
  // 마스터 품목 선택 다이얼로그 상태
  const [masterItemDialog, setMasterItemDialog] = useState<{
    open: boolean;
    groupIndex: number;
    itemIndex: number;
  }>({
    open: false,
    groupIndex: -1,
    itemIndex: -1
  });

  // 저장 및 PDF 상태
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  
  // 자동 저장 및 페이지 보호 상태
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveredData, setRecoveredData] = useState<any>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  
  // 안전한 훅 사용
  const { 
    formData, 
    updateFormData, 
    addGroup, 
    removeGroup,
    addItem,
    updateItem,
    removeItem,
    addDetail,
    addDetailFromMaster,
    updateDetail,
    removeDetail,
    calculation,
    isCalculating,
    applyTemplate,
    suppliers,
    isDirty
  } = useMotionsenseQuoteSafe();

  // 컴포넌트 마운트 시 중요한 컴포넌트들 프리로드
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadAll();
    }, 1000); // 1초 후 프리로드 시작

    return () => clearTimeout(timer);
  }, [preloadAll]);

  // 메모화된 이벤트 핸들러들
  const handleSaveQuote = useCallback(async () => {
    if (!formData?.project_title?.trim()) {
      showSnackbar('프로젝트명을 입력해주세요.', 'warning');
      return;
    }

    if (!formData?.groups?.length || formData.groups.length === 0) {
      showSnackbar('최소 하나 이상의 그룹을 추가해주세요.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/motionsense-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_info: {
            name: formData.project_title,
            client_name: formData.customer_name_snapshot || '',
            issue_date: formData.issue_date,
            due_date: formData.issue_date,
          },
          groups: formData.groups,
          agency_fee_rate: formData.agency_fee_rate,
          discount_amount: formData.discount_amount,
          vat_type: formData.vat_type,
          show_cost_management: formData.show_cost_management,
          calculation: calculation,
          status: 'draft'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSavedQuoteId(result.data.id);
        showSnackbar('견적서가 성공적으로 저장되었습니다.', 'success');
        clearTempData?.();
      } else {
        throw new Error(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('견적서 저장 실패:', error);
      showSnackbar(error instanceof Error ? error.message : '견적서 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [formData, calculation]);

  const handleDownloadPDF = useCallback(async () => {
    if (!savedQuoteId) {
      showSnackbar('먼저 견적서를 저장해주세요.', 'warning');
      return;
    }

    try {
      const response = await fetch(`/api/motionsense-quotes/${savedQuoteId}/pdf`, {
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error('PDF 생성에 실패했습니다.');
      }

      const htmlContent = await response.text();
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('팝업이 차단되었습니다. 팝업을 허용해 주세요.');
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      showSnackbar(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.', 'error');
    }
  }, [savedQuoteId]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleAutoSave = useCallback(async (data: any) => {
    setAutoSaveStatus('saving');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAutoSaveStatus('saved');
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('자동 저장 실패:', error);
      setAutoSaveStatus('error');
      setTimeout(() => {
        setAutoSaveStatus('idle');  
      }, 3000);
    }
  }, []);

  const toggleItemExpansion = useCallback((groupIndex: number, itemIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const openMasterItemDialog = useCallback((groupIndex: number, itemIndex: number) => {
    setMasterItemDialog({
      open: true,
      groupIndex,
      itemIndex
    });
  }, []);

  const closeMasterItemDialog = useCallback(() => {
    setMasterItemDialog({
      open: false,
      groupIndex: -1,
      itemIndex: -1
    });
  }, []);

  const handleMasterItemSelect = useCallback((masterItem: MasterItem) => {
    if (masterItemDialog.groupIndex >= 0 && masterItemDialog.itemIndex >= 0) {
      addDetailFromMaster?.(
        masterItemDialog.groupIndex,
        masterItemDialog.itemIndex,
        masterItem
      );
    }
  }, [masterItemDialog, addDetailFromMaster]);

  const handleBackToList = useCallback(() => {
    router.push('/quotes');
  }, [router]);

  // 자동 저장 훅 사용
  const { recoverTempData, clearTempData } = useAutoSave({
    data: formData,
    onSave: handleAutoSave,
    enabled: true,
    delay: 3000,
    key: 'quote_draft'
  });

  // 페이지 이탈 방지 훅 사용
  useFormProtection(isDirty && !savedQuoteId, {
    message: '변경사항이 저장되지 않았습니다. 정말 페이지를 떠나시겠습니까?'
  });

  // 메모화된 견적 그룹들
  const quoteGroups = useMemo(() => {
    return formData?.groups?.map((group, groupIndex) => (
      <Box key={groupIndex} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, bgcolor: 'white' }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
              label="그룹명"
              value={group.name}
              onChange={(e) => {
                const updatedGroups = [...(formData?.groups || [])];
                updatedGroups[groupIndex] = { ...group, name: e.target.value };
                updateFormData?.({ groups: updatedGroups });
              }}
              size="small"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={group.include_in_fee}
                  onChange={(e) => {
                    const updatedGroups = [...(formData?.groups || [])];
                    updatedGroups[groupIndex] = { ...group, include_in_fee: e.target.checked };
                    updateFormData?.({ groups: updatedGroups });
                  }}
                  size="small"
                />
              }
              label="대행수수료 적용"
              sx={{ 
                mr: { xs: 0, sm: 2 }, 
                mb: { xs: 1, sm: 0 },
                whiteSpace: { xs: 'normal', sm: 'nowrap' }
              }}
            />
            <Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => addItem?.(groupIndex, '새 항목')}
                size="small"
                sx={{ 
                  mr: 1,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                항목 추가
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => removeGroup?.(groupIndex)}
                size="small"
                sx={{ 
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                그룹 삭제
              </Button>
            </Box>
          </Box>

          {group.items?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              항목을 추가하세요.
            </Typography>
          ) : (
            <Box>
              {group.items?.map((item, itemIndex) => {
                const key = `${groupIndex}-${itemIndex}`;
                const isExpanded = expandedItems[key] !== undefined ? expandedItems[key] : true;
                
                return (
                  <QuoteItemCollapsible
                    key={itemIndex}
                    item={item}
                    itemIndex={itemIndex}
                    groupIndex={groupIndex}
                    isExpanded={isExpanded}
                    showCostManagement={formData?.show_cost_management || false}
                    suppliers={suppliers}
                    onUpdateItem={updateItem}
                    onRemoveItem={removeItem}
                    onAddDetail={addDetail}
                    onUpdateDetail={updateDetail}
                    onRemoveDetail={removeDetail}
                    onToggleExpansion={toggleItemExpansion}
                    onOpenMasterItemDialog={openMasterItemDialog}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    )) || [];
  }, [
    formData?.groups,
    formData?.show_cost_management,
    expandedItems,
    suppliers,
    updateFormData,
    updateItem,
    removeItem,
    addItem,
    removeGroup,
    addDetail,
    updateDetail,
    removeDetail,
    toggleItemExpansion,
    openMasterItemDialog
  ]);

  return (
    <PerformanceProfiler id="QuoteNewPageOptimized">
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* 페이지 헤더 */}
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'flex-start' },
          gap: { xs: 3, sm: 2 }
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              새 견적서 작성 (최적화됨)
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' }
            }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                모션센스 견적서를 작성합니다.
              </Typography>
              
              {/* 자동 저장 상태 표시 */}
              {autoSaveStatus !== 'idle' && (
                <Chip
                  size="small"
                  icon={
                    autoSaveStatus === 'saving' ? <CloudUploadIcon /> :
                    autoSaveStatus === 'saved' ? <CloudDoneIcon /> :
                    autoSaveStatus === 'error' ? <WarningIcon /> : undefined
                  }
                  label={
                    autoSaveStatus === 'saving' ? '저장 중...' :
                    autoSaveStatus === 'saved' ? '자동 저장됨' :
                    autoSaveStatus === 'error' ? '저장 실패' : ''
                  }
                  color={
                    autoSaveStatus === 'saving' ? 'primary' :
                    autoSaveStatus === 'saved' ? 'success' :
                    autoSaveStatus === 'error' ? 'error' : 'default'
                  }
                  variant="outlined"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                />
              )}
            </Box>
          </Box>
          
          {/* 저장 및 PDF 버튼 */}
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' }
          }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveQuote}
              disabled={isSaving || !formData?.project_title?.trim()}
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
                minHeight: 44,
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              {isSaving ? '저장 중...' : '견적서 저장'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={handleDownloadPDF}
              disabled={!savedQuoteId}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': { 
                  borderColor: 'primary.dark',
                  color: 'primary.dark',
                  boxShadow: 'none'
                },
                boxShadow: 'none',
                minHeight: 44,
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}
            >
              PDF 다운로드
            </Button>
          </Box>
        </Box>

        {/* 템플릿 선택 섹션 */}
        <LazyWrapper>
          <LazyTemplateSelector onApplyTemplate={applyTemplate} />
        </LazyWrapper>

        <Grid container spacing={3}>
          {/* 기본 정보 섹션 */}
          <Grid item xs={12} md={8}>
            <BasicInfoSection 
              formData={formData} 
              updateFormData={updateFormData} 
            />

            {/* 견적 그룹 섹션 */}
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  견적 항목
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addGroup?.('새 그룹')}
                  size="small"
                  sx={{ 
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' }
                  }}
                >
                  그룹 추가
                </Button>
              </Box>

              {formData?.groups?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    견적 그룹을 추가하여 시작하세요.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {quoteGroups}
                </Box>
              )}
            </Box>
          </Grid>

          {/* 계산 결과 사이드바 */}
          <Grid item xs={12} md={4}>
            <AdvancedSettingsSection 
              formData={formData} 
              updateFormData={updateFormData} 
            />

            <Box sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              bgcolor: 'white', 
              position: { xs: 'static', md: 'sticky' },
              top: { md: 20 }, 
              p: 3 
            }}>
              <Typography variant="h6" gutterBottom>
                견적 금액
              </Typography>
              
              <CalculationSummary
                calculation={calculation}
                formData={formData}
                isCalculating={isCalculating}
                onBackToList={handleBackToList}
              />
            </Box>
          </Grid>
        </Grid>

        {/* 마스터 품목 선택 다이얼로그 */}
        <LazyWrapper>
          <LazyMasterItemSelector
            open={masterItemDialog.open}
            onClose={closeMasterItemDialog}
            onSelect={handleMasterItemSelect}
          />
        </LazyWrapper>

        {/* 스낵바 */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            bottom: { xs: 80, sm: 24 },
            width: { xs: '90%', sm: 'auto' },
            left: { xs: '50%', sm: 'auto' },
            transform: { xs: 'translateX(-50%)', sm: 'none' }
          }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </PerformanceProfiler>
  );
}