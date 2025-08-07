// ========================================
// 견적서 → 프로젝트 전환 UI 컴포넌트
// PROJECT_CONVERSION_UI.jsx
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Switch,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Calculate as CalculateIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import { toast } from 'react-toastify';

// ========================================
// 1. 메인 프로젝트 전환 다이얼로그
// ========================================

const ProjectConversionDialog = ({
  open,
  onClose,
  quote,
  onConvert,
  userRole = 'member'
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [projectData, setProjectData] = useState({
    projectName: quote?.project_title || '',
    startDate: new Date(),
    endDate: null,
    paymentSchedule: [
      { id: 1, name: '계약금', percentage: 30, dueOffset: 0 },
      { id: 2, name: '중도금', percentage: 30, dueOffset: 45 },
      { id: 3, name: '잔금', percentage: 40, dueOffset: 90 }
    ],
    autoSchedule: true
  });
  const [validation, setValidation] = useState({
    isValid: false,
    errors: [],
    warnings: []
  });
  const [isConverting, setIsConverting] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // 권한 확인
  useEffect(() => {
    if (open && !permissionChecked) {
      checkPermission();
    }
  }, [open]);

  const checkPermission = async () => {
    try {
      const response = await fetch('/api/projects/check-permission');
      const data = await response.json();
      setHasPermission(data.hasPermission);
      setPermissionChecked(true);
      
      if (!data.hasPermission) {
        toast.error('프로젝트 생성 권한이 없습니다. 관리자에게 문의하세요.');
      }
    } catch (error) {
      console.error('권한 확인 실패:', error);
      setHasPermission(false);
      setPermissionChecked(true);
    }
  };

  // 프로젝트 데이터 검증
  useEffect(() => {
    validateProjectData();
  }, [projectData]);

  const validateProjectData = () => {
    const errors = [];
    const warnings = [];

    // 프로젝트명 검증
    if (!projectData.projectName.trim()) {
      errors.push('프로젝트명을 입력해주세요.');
    }

    // 정산 스케줄 검증
    const totalPercentage = projectData.paymentSchedule.reduce(
      (sum, item) => sum + (item.percentage || 0), 0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`정산 비율의 합이 100%가 아닙니다. (현재: ${totalPercentage}%)`);
    }

    // 빈 정산 항목 검증
    const emptyItems = projectData.paymentSchedule.filter(
      item => !item.name.trim() || !item.percentage
    );
    if (emptyItems.length > 0) {
      errors.push('모든 정산 항목의 이름과 비율을 입력해주세요.');
    }

    // 시작일 검증
    if (!projectData.startDate) {
      errors.push('프로젝트 시작일을 선택해주세요.');
    } else if (projectData.startDate < new Date()) {
      warnings.push('프로젝트 시작일이 과거입니다.');
    }

    // 종료일 검증
    if (projectData.endDate && projectData.startDate) {
      if (projectData.endDate <= projectData.startDate) {
        errors.push('프로젝트 종료일은 시작일보다 늦어야 합니다.');
      }
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleConvert = async () => {
    if (!validation.isValid || !hasPermission) return;

    setIsConverting(true);
    try {
      const result = await onConvert({
        quoteId: quote.id,
        projectData,
        paymentSchedule: projectData.paymentSchedule
      });

      if (result.success) {
        toast.success('프로젝트가 성공적으로 생성되었습니다.');
        onClose();
      } else {
        toast.error(result.message || '프로젝트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로젝트 전환 실패:', error);
      toast.error('프로젝트 전환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting(false);
    }
  };

  if (!permissionChecked) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress sx={{ flexGrow: 1 }} />
            <Typography>권한 확인 중...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!hasPermission) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="error" />
            권한 부족
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            <AlertTitle>프로젝트 생성 권한이 없습니다</AlertTitle>
            프로젝트 생성은 관리자 권한이 필요합니다. 관리자에게 문의해주세요.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>닫기</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const steps = ['기본 정보', '정산 계획', '최종 확인'];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="primary" />
            견적서 → 프로젝트 전환
            <Chip 
              label={`${quote?.total_amount?.toLocaleString()}원`} 
              color="primary" 
              size="small"
            />
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: 기본 정보 */}
            <Step>
              <StepLabel>프로젝트 기본 정보</StepLabel>
              <StepContent>
                <ProjectBasicInfo 
                  projectData={projectData}
                  setProjectData={setProjectData}
                  quote={quote}
                />
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={handleNext}>
                    다음
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: 정산 계획 */}
            <Step>
              <StepLabel>정산 스케줄</StepLabel>
              <StepContent>
                <PaymentScheduleManager 
                  projectData={projectData}
                  setProjectData={setProjectData}
                  totalAmount={quote?.total_amount || 0}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={handleBack}>이전</Button>
                  <Button 
                    variant="contained" 
                    onClick={handleNext}
                    disabled={!validation.isValid}
                  >
                    다음
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: 최종 확인 */}
            <Step>
              <StepLabel>최종 확인</StepLabel>
              <StepContent>
                <ProjectSummary 
                  projectData={projectData}
                  quote={quote}
                  validation={validation}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={handleBack}>이전</Button>
                  <Button 
                    variant="contained"
                    color="primary"
                    onClick={handleConvert}
                    disabled={!validation.isValid || isConverting}
                    startIcon={isConverting ? <LinearProgress size={20} /> : <CheckCircleIcon />}
                  >
                    {isConverting ? '프로젝트 생성 중...' : '프로젝트 생성'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>

          {/* 검증 결과 표시 */}
          <ValidationResults validation={validation} />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isConverting}>
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

// ========================================
// 2. 프로젝트 기본 정보 컴포넌트
// ========================================

const ProjectBasicInfo = ({ projectData, setProjectData, quote }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          <AlertTitle>견적서 정보</AlertTitle>
          고객사: {quote?.customer_name || '알 수 없음'} | 
          견적 금액: {quote?.total_amount?.toLocaleString() || 0}원
        </Alert>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="프로젝트명"
          value={projectData.projectName}
          onChange={(e) => setProjectData(prev => ({
            ...prev,
            projectName: e.target.value
          }))}
          helperText="프로젝트를 식별할 수 있는 명확한 이름을 입력하세요"
        />
      </Grid>

      <Grid item xs={6}>
        <DatePicker
          label="프로젝트 시작일"
          value={projectData.startDate}
          onChange={(date) => setProjectData(prev => ({
            ...prev,
            startDate: date
          }))}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>

      <Grid item xs={6}>
        <DatePicker
          label="프로젝트 종료일 (선택사항)"
          value={projectData.endDate}
          onChange={(date) => setProjectData(prev => ({
            ...prev,
            endDate: date
          }))}
          renderInput={(params) => <TextField {...params} fullWidth />}
          minDate={projectData.startDate}
        />
      </Grid>

      <Grid item xs={12}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={projectData.autoSchedule}
                onChange={(e) => setProjectData(prev => ({
                  ...prev,
                  autoSchedule: e.target.checked
                }))}
              />
            }
            label="정산 일정 자동 계산 (프로젝트 기간 기준)"
          />
        </FormGroup>
      </Grid>
    </Grid>
  );
};

// ========================================
// 3. 정산 스케줄 관리 컴포넌트
// ========================================

const PaymentScheduleManager = ({ projectData, setProjectData, totalAmount }) => {
  const addPaymentItem = () => {
    const newItem = {
      id: Date.now(),
      name: '',
      percentage: 0,
      dueOffset: 30
    };
    setProjectData(prev => ({
      ...prev,
      paymentSchedule: [...prev.paymentSchedule, newItem]
    }));
  };

  const removePaymentItem = (id) => {
    setProjectData(prev => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.filter(item => item.id !== id)
    }));
  };

  const updatePaymentItem = (id, field, value) => {
    setProjectData(prev => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const presetSchedules = [
    {
      name: '3단계 (계약금-중도금-잔금)',
      schedule: [
        { id: 1, name: '계약금', percentage: 30, dueOffset: 0 },
        { id: 2, name: '중도금', percentage: 30, dueOffset: 45 },
        { id: 3, name: '잔금', percentage: 40, dueOffset: 90 }
      ]
    },
    {
      name: '2단계 (계약금-잔금)',
      schedule: [
        { id: 1, name: '계약금', percentage: 50, dueOffset: 0 },
        { id: 2, name: '잔금', percentage: 50, dueOffset: 60 }
      ]
    },
    {
      name: '4단계 (계약금-1차-2차-잔금)',
      schedule: [
        { id: 1, name: '계약금', percentage: 25, dueOffset: 0 },
        { id: 2, name: '1차 중도금', percentage: 25, dueOffset: 30 },
        { id: 3, name: '2차 중도금', percentage: 25, dueOffset: 60 },
        { id: 4, name: '잔금', percentage: 25, dueOffset: 90 }
      ]
    }
  ];

  const applyPreset = (preset) => {
    setProjectData(prev => ({
      ...prev,
      paymentSchedule: [...preset.schedule]
    }));
  };

  const totalPercentage = projectData.paymentSchedule.reduce(
    (sum, item) => sum + (item.percentage || 0), 0
  );

  return (
    <Box>
      {/* 프리셋 선택 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            정산 스케줄 프리셋
          </Typography>
          <Grid container spacing={2}>
            {presetSchedules.map((preset, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => applyPreset(preset)}
                  sx={{ textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  {preset.name}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* 정산 항목 목록 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          정산 항목
        </Typography>
        <Chip 
          label={`총 ${totalPercentage}%`}
          color={Math.abs(totalPercentage - 100) < 0.01 ? 'success' : 'error'}
        />
      </Box>

      {projectData.paymentSchedule.map((item, index) => (
        <PaymentScheduleItem
          key={item.id}
          item={item}
          index={index}
          totalAmount={totalAmount}
          onUpdate={updatePaymentItem}
          onRemove={removePaymentItem}
          canRemove={projectData.paymentSchedule.length > 1}
        />
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={addPaymentItem}
        sx={{ mt: 2 }}
      >
        정산 항목 추가
      </Button>
    </Box>
  );
};

// ========================================
// 4. 개별 정산 항목 컴포넌트
// ========================================

const PaymentScheduleItem = ({ 
  item, 
  index, 
  totalAmount, 
  onUpdate, 
  onRemove, 
  canRemove 
}) => {
  const amount = Math.round((totalAmount * (item.percentage || 0)) / 100);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="정산 항목명"
              value={item.name}
              onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
              size="small"
            />
          </Grid>
          
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              label="비율 (%)"
              type="number"
              value={item.percentage}
              onChange={(e) => onUpdate(item.id, 'percentage', parseInt(e.target.value) || 0)}
              size="small"
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              label="일정 (일)"
              type="number"
              value={item.dueOffset}
              onChange={(e) => onUpdate(item.id, 'dueOffset', parseInt(e.target.value) || 0)}
              size="small"
              inputProps={{ min: 0 }}
            />
          </Grid>
          
          <Grid item xs={8} sm={4}>
            <Typography variant="body2" color="text.secondary">
              정산 금액: <strong>{amount.toLocaleString()}원</strong>
            </Typography>
          </Grid>
          
          <Grid item xs={4} sm={1}>
            <IconButton
              onClick={() => onRemove(item.id)}
              disabled={!canRemove}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ========================================
// 5. 프로젝트 요약 컴포넌트
// ========================================

const ProjectSummary = ({ projectData, quote, validation }) => {
  return (
    <Grid container spacing={3}>
      {/* 프로젝트 정보 요약 */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              프로젝트 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  프로젝트명
                </Typography>
                <Typography variant="body1">
                  {projectData.projectName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  고객사
                </Typography>
                <Typography variant="body1">
                  {quote?.customer_name || '알 수 없음'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  시작일
                </Typography>
                <Typography variant="body1">
                  {projectData.startDate?.toLocaleDateString('ko-KR')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  종료일
                </Typography>
                <Typography variant="body1">
                  {projectData.endDate?.toLocaleDateString('ko-KR') || '미설정'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* 정산 스케줄 요약 */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              정산 스케줄
            </Typography>
            {projectData.paymentSchedule.map((item, index) => {
              const amount = Math.round((quote?.total_amount * (item.percentage || 0)) / 100);
              const dueDate = new Date(projectData.startDate);
              dueDate.setDate(dueDate.getDate() + item.dueOffset);

              return (
                <Box key={item.id} sx={{ mb: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={3}>
                      <Typography variant="body1">
                        {item.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={2}>
                      <Chip 
                        label={`${item.percentage}%`} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {amount.toLocaleString()}원
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="body2" color="text.secondary">
                        {dueDate.toLocaleDateString('ko-KR')}
                      </Typography>
                    </Grid>
                  </Grid>
                  {index < projectData.paymentSchedule.length - 1 && (
                    <Divider sx={{ mt: 1 }} />
                  )}
                </Box>
              );
            })}
            
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                총 계약 금액
              </Typography>
              <Typography variant="h6" color="primary">
                {quote?.total_amount?.toLocaleString() || 0}원
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// ========================================
// 6. 검증 결과 컴포넌트
// ========================================

const ValidationResults = ({ validation }) => {
  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 1 }}>
          <AlertTitle>오류</AlertTitle>
          {validation.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error}
            </Typography>
          ))}
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning">
          <AlertTitle>경고</AlertTitle>
          {validation.warnings.map((warning, index) => (
            <Typography key={index} variant="body2">
              • {warning}
            </Typography>
          ))}
        </Alert>
      )}
    </Box>
  );
};

export default ProjectConversionDialog;

// ========================================
// 7. 사용 예시
// ========================================

/*
// 견적서 목록 또는 상세 페이지에서 사용
const QuoteDetailPage = () => {
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [quote, setQuote] = useState(null);

  const handleConvertToProject = async (conversionData) => {
    try {
      const response = await fetch('/api/projects/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conversionData)
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('프로젝트 전환 실패:', error);
      return { success: false, message: '프로젝트 전환에 실패했습니다.' };
    }
  };

  return (
    <div>
      <Button 
        variant="contained"
        onClick={() => setShowConversionDialog(true)}
        disabled={quote?.status !== 'approved'}
      >
        프로젝트로 전환
      </Button>

      <ProjectConversionDialog
        open={showConversionDialog}
        onClose={() => setShowConversionDialog(false)}
        quote={quote}
        onConvert={handleConvertToProject}
        userRole="admin"
      />
    </div>
  );
};
*/