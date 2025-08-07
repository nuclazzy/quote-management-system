'use client';

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
  Autocomplete,
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
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon, 
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
import { useState, useEffect, useCallback } from 'react';
import MasterItemSelector from '@/components/quotes/MasterItemSelector';
import TemplateSelector from '@/components/quotes/TemplateSelector';
import DebugPanel from '@/components/debug/DebugPanel';
import { MasterItem } from '@/types/motionsense-quote';

// Debug step 인터페이스
interface DebugStep {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
  timestamp?: Date;
}

export default function QuoteNewPage() {
  const router = useRouter();
  
  // 에러 상태 관리
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 디버그 상태 관리
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([
    {
      id: 'test-1',
      name: 'Test System',
      status: 'success',
      message: '디버그 패널 테스트 - 이것이 보이면 패널이 작동중입니다!',
      timestamp: new Date()
    },
    {
      id: 'test-2', 
      name: 'Test Error',
      status: 'error',
      message: '테스트 에러 - 빨간색 테두리가 보여야 합니다',
      timestamp: new Date()
    }
  ]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  
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
  
  // 디버그 로거 설정
  const addDebugStep = useCallback((step: DebugStep) => {
    setDebugSteps(prev => [...prev, step]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugSteps([]);
  }, []);

  // 전역 디버그 로거 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugLogger = {
        addStep: addDebugStep,
        steps: debugSteps
      };
    }
    return () => {
      if (typeof window !== 'undefined' && window.debugLogger) {
        delete window.debugLogger;
      }
    };
  }, [addDebugStep, debugSteps]);

  // 시스템 초기화 디버그 로그 추가
  useEffect(() => {
    addDebugStep({
      id: `system-init-${Date.now()}`,
      name: 'Quote System',
      status: 'loading',
      message: '견적서 시스템 초기화 시작',
      timestamp: new Date()
    });
  }, [addDebugStep]);

  // 안전한 훅 사용
  let hookData;
  try {
    addDebugStep({
      id: `hook-init-${Date.now()}`,
      name: 'Hook Initialization',
      status: 'loading',
      message: 'useMotionsenseQuoteSafe 훅 초기화 시작',
      timestamp: new Date()
    });
    
    hookData = useMotionsenseQuoteSafe();
    
    addDebugStep({
      id: `hook-success-${Date.now()}`,
      name: 'Hook Initialization',
      status: 'success',
      message: 'useMotionsenseQuoteSafe 훅 초기화 성공',
      details: {
        hasFormData: !!hookData?.formData,
        hasUpdateFormData: !!hookData?.updateFormData,
        hasCalculation: !!hookData?.calculation,
        projectTitle: hookData?.formData?.project_title || 'empty',
        groupsCount: hookData?.formData?.groups?.length || 0
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Hook initialization error:', error);
    
    addDebugStep({
      id: `hook-error-${Date.now()}`,
      name: 'Hook Initialization',
      status: 'error',
      message: 'useMotionsenseQuoteSafe 훅 초기화 실패',
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name || 'Unknown'
      },
      timestamp: new Date()
    });
    
    setHasError(true);
    setErrorMessage('견적서 시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  }
  
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
  } = hookData || {};

  // 임시 저장 함수 (자동 저장용)  
  const handleAutoSave = useCallback(async (data: any) => {
    setAutoSaveStatus('saving');
    try {
      // 실제로는 서버에 저장하지 않고 로컬 스토리지만 사용
      // 서버 저장은 사용자가 수동으로 저장할 때만 실행
      await new Promise(resolve => setTimeout(resolve, 500)); // 시뮬레이션
      setAutoSaveStatus('saved');
      
      // 3초 후 상태 초기화
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

  // 견적서 저장 함수 (수동 저장)
  const handleSaveQuote = async () => {
    addDebugStep({
      id: `save-quote-${Date.now()}`,
      name: 'Quote Save',
      status: 'loading',
      message: '견적서 저장 시작',
      details: {
        projectTitle: formData?.project_title,
        customerName: formData?.customer_name_snapshot,
        groupsCount: formData?.groups?.length || 0,
        totalAmount: calculation?.final_total || 0
      },
      timestamp: new Date()
    });
    
    if (!formData?.project_title?.trim()) {
      addDebugStep({
        id: `save-validation-error-${Date.now()}`,
        name: 'Quote Save',
        status: 'error',
        message: '유효성 검사 실패: 프로젝트명 누락',
        timestamp: new Date()
      });
      showSnackbar('프로젝트명을 입력해주세요.', 'warning');
      return;
    }

    if (!formData?.groups?.length || formData.groups.length === 0) {
      addDebugStep({
        id: `save-validation-error-${Date.now()}`,
        name: 'Quote Save',
        status: 'error',
        message: '유효성 검사 실패: 그룹 없음',
        timestamp: new Date()
      });
      showSnackbar('최소 하나 이상의 그룹을 추가해주세요.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const requestData = {
        project_info: {
          name: formData.project_title,
          client_name: formData.customer_name_snapshot || '',
          issue_date: formData.issue_date,
          due_date: formData.issue_date, // 기본값으로 발행일과 동일하게 설정
        },
        groups: formData.groups,
        agency_fee_rate: formData.agency_fee_rate,
        discount_amount: formData.discount_amount,
        vat_type: formData.vat_type,
        show_cost_management: formData.show_cost_management,
        calculation: calculation,
        status: 'draft'
      };
      
      addDebugStep({
        id: `api-request-${Date.now()}`,
        name: 'Quote Save',
        status: 'loading',
        message: 'API 요청 전송 중',
        details: {
          endpoint: '/api/motionsense-quotes',
          method: 'POST',
          requestSize: JSON.stringify(requestData).length,
          groupsCount: requestData.groups.length,
          totalItems: requestData.groups.reduce((sum, g) => sum + g.items.length, 0)
        },
        timestamp: new Date()
      });
      
      const response = await fetch('/api/motionsense-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      addDebugStep({
        id: `api-response-${Date.now()}`,
        name: 'Quote Save',
        status: response.ok ? 'success' : 'error',
        message: `API 응답 수신: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        },
        timestamp: new Date()
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addDebugStep({
          id: `save-success-${Date.now()}`,
          name: 'Quote Save',
          status: 'success',
          message: '견적서 저장 성공',
          details: {
            quoteId: result.data.id,
            quoteNumber: result.data.quote_number
          },
          timestamp: new Date()
        });
        
        setSavedQuoteId(result.data.id);
        showSnackbar('견적서가 성공적으로 저장되었습니다.', 'success');
        
        // 저장 성공 시 임시 데이터 삭제
        clearTempData?.();
      } else {
        addDebugStep({
          id: `save-fail-${Date.now()}`,
          name: 'Quote Save',
          status: 'error',
          message: '견적서 저장 실패',
          details: {
            resultSuccess: result.success,
            resultMessage: result.message,
            resultError: result.error
          },
          timestamp: new Date()
        });
        throw new Error(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      addDebugStep({
        id: `save-error-${Date.now()}`,
        name: 'Quote Save',
        status: 'error',
        message: '견적서 저장 중 예외 발생',
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: new Date()
      });
      
      console.error('견적서 저장 실패:', error);
      showSnackbar(error instanceof Error ? error.message : '견적서 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 스낵바 표시 함수
  const showSnackbar = useCallback((message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // PDF 다운로드 함수
  const handleDownloadPDF = async () => {
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
        }, 1000); // 폰트 로딩을 위해 대기 시간 증가
      };
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      showSnackbar(error instanceof Error ? error.message : 'PDF 다운로드에 실패했습니다.', 'error');
    }
  };

  // 항목 펼침/접힘 토글
  const toggleItemExpansion = (groupIndex: number, itemIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`;
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 마스터 품목 선택 다이얼로그 열기
  const openMasterItemDialog = (groupIndex: number, itemIndex: number) => {
    setMasterItemDialog({
      open: true,
      groupIndex,
      itemIndex
    });
  };

  // 마스터 품목 선택 다이얼로그 닫기
  const closeMasterItemDialog = () => {
    setMasterItemDialog({
      open: false,
      groupIndex: -1,
      itemIndex: -1
    });
  };

  // 마스터 품목 선택 처리
  const handleMasterItemSelect = (masterItem: MasterItem) => {
    if (masterItemDialog.groupIndex >= 0 && masterItemDialog.itemIndex >= 0) {
      addDetailFromMaster?.(
        masterItemDialog.groupIndex,
        masterItemDialog.itemIndex,
        masterItem
      );
    }
  };

  // 데이터 복구 처리
  const handleRecoverData = useCallback(() => {
    if (recoveredData) {
      // 복구된 데이터를 전체적으로 적용
      updateFormData?.(recoveredData);
      
      showSnackbar('임시 저장된 데이터를 복구했습니다.', 'success');
      setShowRecoveryDialog(false);
      setRecoveredData(null);
      clearTempData?.();
    }
  }, [recoveredData, updateFormData, showSnackbar, clearTempData]);

  // 데이터 복구 거부 처리
  const handleDiscardRecovery = useCallback(() => {
    setShowRecoveryDialog(false);
    setRecoveredData(null);
    clearTempData?.();
    showSnackbar('임시 저장된 데이터를 삭제했습니다.', 'info');
  }, [showSnackbar, clearTempData]);

  // 자동 저장 훅 사용
  const { recoverTempData, clearTempData } = useAutoSave({
    data: formData,
    onSave: handleAutoSave,
    enabled: true,
    delay: 3000, // 3초 후 자동 저장
    key: 'quote_draft'
  });

  // 페이지 이탈 방지 훅 사용
  useFormProtection(isDirty && !savedQuoteId, {
    message: '변경사항이 저장되지 않았습니다. 정말 페이지를 떠나시겠습니까?'
  });

  // 컴포넌트 마운트 시 임시 저장된 데이터가 있는지 확인
  useEffect(() => {
    addDebugStep({
      id: `recovery-check-${Date.now()}`,
      name: 'Data Recovery',
      status: 'loading',
      message: '임시 저장된 데이터 확인 중',
      timestamp: new Date()
    });
    
    try {
      const tempData = recoverTempData?.();
      if (tempData && Object.keys(tempData).length > 0) {
        // 현재 폼에 데이터가 거의 없는 경우에만 복구 다이얼로그 표시
        const hasMinimalData = !formData?.project_title && (!formData?.groups || formData.groups.length === 0);
        
        addDebugStep({
          id: `recovery-found-${Date.now()}`,
          name: 'Data Recovery',
          status: hasMinimalData ? 'success' : 'warning',
          message: hasMinimalData ? '임시 저장 데이터 발견, 복구 다이얼로그 표시' : '임시 저장 데이터가 있지만 현재 폼에 데이터가 있어 무시',
          details: {
            tempDataKeys: Object.keys(tempData),
            hasMinimalData,
            currentProjectTitle: formData?.project_title,
            currentGroupsCount: formData?.groups?.length
          },
          timestamp: new Date()
        });
        
        if (hasMinimalData) {
          setRecoveredData(tempData);
          setShowRecoveryDialog(true);
        }
      } else {
        addDebugStep({
          id: `recovery-none-${Date.now()}`,
          name: 'Data Recovery',
          status: 'success',
          message: '임시 저장된 데이터 없음',
          timestamp: new Date()
        });
      }
    } catch (error) {
      addDebugStep({
        id: `recovery-error-${Date.now()}`,
        name: 'Data Recovery',
        status: 'error',
        message: '임시 저장 데이터 확인 중 오류 발생',
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: new Date()
      });
    }
  }, [recoverTempData, formData?.project_title, formData?.groups, addDebugStep]);

  // 에러가 있거나 훅이 초기화되지 않았을 때 로딩/에러 처리
  if (hasError || !hookData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            견적서 시스템 오류
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {errorMessage || '시스템 초기화 중 문제가 발생했습니다.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              startIcon={<RestoreIcon />}
            >
              페이지 새로고침
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/quotes')}
            >
              견적서 목록으로
            </Button>
          </Box>
        </Box>
        
        {/* 에러 상황에서도 디버그 패널 표시 */}
        <DebugPanel
          steps={debugSteps}
          onClearLogs={clearDebugLogs}
          visible={showDebugPanel}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* 페이지 헤더 - 모바일 최적화 */}
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
            새 견적서 작성
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
        
        {/* 저장 및 PDF 버튼 - 모바일 최적화 */}
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
              minHeight: 44, // 모바일 터치 타겟 크기
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
              minHeight: 44, // 모바일 터치 타겟 크기
              fontSize: { xs: '0.875rem', sm: '0.875rem' }
            }}
          >
            PDF 다운로드
          </Button>
        </Box>
      </Box>

      {/* 템플릿 선택 섹션 */}
      <TemplateSelector onApplyTemplate={applyTemplate} />

      <Grid container spacing={3}>
        {/* 기본 정보 섹션 */}
        <Grid item xs={12} md={8}>
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', mb: 3, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              기본 정보
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="프로젝트명 *"
                  value={formData?.project_title || ''}
                  onChange={(e) => updateFormData?.({ project_title: e.target.value })}
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
                  onChange={(e) => updateFormData?.({ customer_name_snapshot: e.target.value })}
                  fullWidth
                  placeholder="고객사명을 입력하세요"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="발행일"
                  type="date"
                  value={formData?.issue_date || ''}
                  onChange={(e) => updateFormData?.({ issue_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>

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
                {formData?.groups?.map((group, groupIndex) => (
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
                            const isExpanded = expandedItems[key] !== undefined ? expandedItems[key] : true; // 기본값: true
                            
                            return (
                              <Box key={itemIndex} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1, bgcolor: 'grey.50' }}>
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
                                      onChange={(e) => updateItem?.(groupIndex, itemIndex, { name: e.target.value })}
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
                                        onClick={() => addDetail?.(groupIndex, itemIndex)}
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
                                        onClick={() => openMasterItemDialog(groupIndex, itemIndex)}
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
                                        onClick={() => toggleItemExpansion(groupIndex, itemIndex)}
                                        size="small"
                                        aria-label={isExpanded ? "세부 항목 접기" : "세부 항목 펼치기"}
                                        sx={{ minWidth: 36, minHeight: 36 }}
                                      >
                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                      </IconButton>
                                      <IconButton
                                        onClick={() => removeItem?.(groupIndex, itemIndex)}
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
                                          {item.details?.map((detail, detailIndex) => (
                                            <Box key={detailIndex} sx={{ 
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
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { name: e.target.value })}
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
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { quantity: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ 
                                                      min: 0, 
                                                      step: 0.1,
                                                      inputMode: 'decimal' // 모바일 숫자 키보드
                                                    }}
                                                  />
                                                </Grid>
                                                <Grid item xs={6} sm={4}>
                                                  <TextField
                                                    label="일수"
                                                    type="number"
                                                    value={detail.days}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { days: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ 
                                                      min: 0, 
                                                      step: 0.5,
                                                      inputMode: 'decimal' // 모바일 숫자 키보드
                                                    }}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                  <TextField
                                                    label="단위"
                                                    value={detail.unit}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit: e.target.value })}
                                                    size="small"
                                                    fullWidth
                                                    placeholder="개"
                                                  />
                                                </Grid>
                                                
                                                {/* 두 번째 행: 단가, 원가 관리 정보 - 모바일 최적화 */}
                                                <Grid item xs={12} sm={formData?.show_cost_management ? 6 : 12}>
                                                  <TextField
                                                    label="단가"
                                                    type="number"
                                                    value={detail.unit_price}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit_price: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ 
                                                      min: 0, 
                                                      step: 1000,
                                                      inputMode: 'numeric' // 모바일 숫자 키보드
                                                    }}
                                                  />
                                                </Grid>
                                                
                                                {formData?.show_cost_management && (
                                                  <Grid item xs={12} sm={6}>
                                                    <TextField
                                                      label="원가"
                                                      type="number"
                                                      value={detail.cost_price || 0}
                                                      onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { cost_price: Number(e.target.value) || 0 })}
                                                      size="small"
                                                      fullWidth
                                                      inputProps={{ 
                                                        min: 0, 
                                                        step: 1000,
                                                        inputMode: 'numeric' // 모바일 숫자 키보드
                                                      }}
                                                    />
                                                  </Grid>
                                                )}
                                                
                                                {/* 공급업체 (원가 관리 모드에서만) */}
                                                {formData?.show_cost_management && (
                                                  <Grid item xs={12}>
                                                    <Autocomplete
                                                      options={suppliers}
                                                      getOptionLabel={(option) => option.name}
                                                      value={suppliers.find(s => s.id === detail.supplier_id) || null}
                                                      onChange={(event, newValue) => {
                                                        updateDetail?.(groupIndex, itemIndex, detailIndex, {
                                                          supplier_id: newValue?.id,
                                                          supplier_name_snapshot: newValue?.name || ''
                                                        });
                                                      }}
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
                                                      {(detail.quantity * detail.days * detail.unit_price).toLocaleString()}원
                                                    </Typography>
                                                  </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <IconButton
                                                      onClick={() => removeDetail?.(groupIndex, itemIndex, detailIndex)}
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
                                          ))}
                                        </Box>
                                      )}
                                    </Box>
                                  </Collapse>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* 계산 결과 사이드바 */}
        <Grid item xs={12} md={4}>
          {/* 고급 설정 패널 */}
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
                      onChange={(e) => updateFormData?.({ show_cost_management: e.target.checked })}
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
                  onChange={(e) => updateFormData?.({ agency_fee_rate: Number(e.target.value) / 100 || 0 })}
                  fullWidth
                  size="small"
                  inputProps={{ 
                    min: 0, 
                    max: 100, 
                    step: 0.1,
                    inputMode: 'decimal' // 모바일 숫자 키보드
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="할인 금액"
                  type="number"
                  value={formData?.discount_amount || 0}
                  onChange={(e) => updateFormData?.({ discount_amount: Number(e.target.value) || 0 })}
                  fullWidth
                  size="small"
                  inputProps={{ 
                    min: 0, 
                    step: 1000,
                    inputMode: 'numeric' // 모바일 숫자 키보드
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>부가세 유형</InputLabel>
                  <Select
                    value={formData?.vat_type || 'exclusive'}
                    label="부가세 유형"
                    onChange={(e) => updateFormData?.({ vat_type: e.target.value as 'exclusive' | 'inclusive' })}
                  >
                    <MenuItem value="exclusive">부가세 별도</MenuItem>
                    <MenuItem value="inclusive">부가세 포함</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: 1, 
            bgcolor: 'white', 
            position: { xs: 'static', md: 'sticky' }, // 모바일에서는 sticky 해제
            top: { md: 20 }, 
            p: 3 
          }}>
            <Typography variant="h6" gutterBottom>
              견적 금액
            </Typography>
            
            {isCalculating ? (
              <Typography variant="body2" color="text.secondary">
                계산 중...
              </Typography>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">소계</Typography>
                  <Typography variant="body2">
                    {(calculation?.subtotal || 0).toLocaleString()}원
                  </Typography>
                </Box>
                
                {/* 대행수수료 적용 대상 표시 */}
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

                    {/* 그룹별 대행수수료 적용 현황 */}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      대행수수료 적용 현황
                    </Typography>
                    
                    {calculation?.groups?.map((group, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {group.name} {group.include_in_fee ? '✓' : '✗'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.subtotal.toLocaleString()}원
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Box>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => router.push('/quotes')}
                sx={{ 
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                목록으로 돌아가기
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* 마스터 품목 선택 다이얼로그 */}
      <MasterItemSelector
        open={masterItemDialog.open}
        onClose={closeMasterItemDialog}
        onSelect={handleMasterItemSelect}
      />

      {/* 데이터 복구 다이얼로그 */}
      <Dialog
        open={showRecoveryDialog}
        onClose={() => {}} // 외부 클릭으로 닫기 방지
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestoreIcon color="primary" />
          임시 저장된 데이터 발견
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            이전에 작성하던 견적서 데이터가 임시 저장되어 있습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            복구하시겠습니까? 아니면 새로 시작하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDiscardRecovery}
            color="inherit"
            variant="outlined"
          >
            새로 시작
          </Button>
          <Button
            onClick={handleRecoverData}
            color="primary"
            variant="contained"
            startIcon={<RestoreIcon />}
          >
            데이터 복구
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          bottom: { xs: 80, sm: 24 }, // 모바일에서는 하단 네비게이션 고려
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

      {/* 에러 상태 다이얼로그 */}
      <Dialog open={hasError} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          시스템 오류
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            견적서 시스템 초기화 중 문제가 발생했습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {errorMessage || '알 수 없는 오류가 발생했습니다.'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            문제가 계속되면 관리자에게 문의하세요.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.location.reload()} variant="contained">
            페이지 새로고침
          </Button>
          <Button onClick={() => router.push('/quotes')} variant="outlined">
            견적서 목록으로
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 디버그 패널 - 직접 HTML 테스트 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          width: '400px',
          height: '300px',
          backgroundColor: 'red',
          border: '5px solid black',
          zIndex: 99999,
          padding: '20px',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        <h2>🚨 디버그 테스트 패널</h2>
        <p>이 패널이 보이면 렌더링이 작동합니다!</p>
        <p>Debug Steps: {debugSteps.length}개</p>
        <p>Show Panel: {showDebugPanel ? 'True' : 'False'}</p>
        <p>현재 시간: {new Date().toLocaleTimeString()}</p>
      </div>
      
      {/* 원래 디버그 패널도 함께 */}
      <DebugPanel
        steps={debugSteps}
        onClearLogs={clearDebugLogs}
        visible={showDebugPanel}
      />
    </Container>
  );
}