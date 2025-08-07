'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
// 날짜 선택을 위한 간단한 대체 구현

interface SettlementItem {
  id: string;
  description: string;
  percentage: number;
  amount: number;
  due_date: Date;
}

interface ProjectConversionData {
  project_name: string;
  start_date: Date | null;
  end_date: Date | null;
  settlement_schedule: SettlementItem[];
}

interface ProjectConversionWizardProps {
  open: boolean;
  onClose: () => void;
  onConvert: (data: ProjectConversionData) => Promise<void>;
  quote: {
    id: string;
    project_title: string;
    final_total: number;
  };
}

const steps = [
  '프로젝트 기본정보',
  '정산 스케줄 설정', 
  '최종 확인'
];

// 정산 스케줄 프리셋
const settlementPresets = {
  two_stage: {
    name: '2단계 정산',
    items: [
      { description: '계약금', percentage: 50, days: 0 },
      { description: '잔금', percentage: 50, days: 30 }
    ]
  },
  three_stage: {
    name: '3단계 정산',
    items: [
      { description: '계약금', percentage: 30, days: 0 },
      { description: '중도금', percentage: 30, days: 30 },
      { description: '잔금', percentage: 40, days: 60 }
    ]
  },
  four_stage: {
    name: '4단계 정산',
    items: [
      { description: '계약금', percentage: 25, days: 0 },
      { description: '1차 중도금', percentage: 25, days: 20 },
      { description: '2차 중도금', percentage: 25, days: 40 },
      { description: '잔금', percentage: 25, days: 60 }
    ]
  }
};

export default function ProjectConversionWizard({
  open,
  onClose,
  onConvert,
  quote
}: ProjectConversionWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [converting, setConverting] = useState(false);
  const [formData, setFormData] = useState<ProjectConversionData>({
    project_name: quote.project_title,
    start_date: new Date(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60일 후
    settlement_schedule: []
  });

  // 컴포넌트 마운트 시 기본 정산 스케줄 설정
  useEffect(() => {
    if (formData.settlement_schedule.length === 0) {
      applyPreset('three_stage');
    }
  }, []);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const applyPreset = (presetKey: keyof typeof settlementPresets) => {
    const preset = settlementPresets[presetKey];
    const startDate = formData.start_date || new Date();
    
    const newSchedule: SettlementItem[] = preset.items.map((item) => ({
      id: generateId(),
      description: item.description,
      percentage: item.percentage,
      amount: Math.round((quote.final_total * item.percentage) / 100),
      due_date: new Date(startDate.getTime() + item.days * 24 * 60 * 60 * 1000)
    }));

    setFormData(prev => ({
      ...prev,
      settlement_schedule: newSchedule
    }));
  };

  const addSettlementItem = () => {
    const newItem: SettlementItem = {
      id: generateId(),
      description: '추가 정산',
      percentage: 0,
      amount: 0,
      due_date: formData.start_date || new Date()
    };

    setFormData(prev => ({
      ...prev,
      settlement_schedule: [...prev.settlement_schedule, newItem]
    }));
  };

  const removeSettlementItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      settlement_schedule: prev.settlement_schedule.filter(item => item.id !== id)
    }));
  };

  const updateSettlementItem = (id: string, field: keyof SettlementItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      settlement_schedule: prev.settlement_schedule.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          // 비율이 변경되면 금액도 자동 계산
          if (field === 'percentage') {
            updated.amount = Math.round((quote.final_total * value) / 100);
          }
          
          // 금액이 변경되면 비율도 자동 계산
          if (field === 'amount') {
            updated.percentage = Math.round((value / quote.final_total) * 100 * 10) / 10;
          }
          
          return updated;
        }
        return item;
      })
    }));
  };

  const getTotalPercentage = () => {
    return formData.settlement_schedule.reduce((sum, item) => sum + item.percentage, 0);
  };

  const getTotalAmount = () => {
    return formData.settlement_schedule.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await onConvert(formData);
      handleClose();
    } catch (error) {
      console.error('프로젝트 전환 실패:', error);
    } finally {
      setConverting(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    onClose();
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.project_name && formData.start_date && formData.end_date);
      case 1:
        return formData.settlement_schedule.length > 0 && 
               Math.abs(getTotalPercentage() - 100) < 0.1;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="프로젝트명"
                  value={formData.project_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="시작일"
                  type="date"
                  value={formData.start_date ? formData.start_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    start_date: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  fullWidth
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="종료일"
                  type="date"
                  value={formData.end_date ? formData.end_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    end_date: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  fullWidth
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  견적서 "{quote.project_title}"를 프로젝트로 전환합니다. 
                  총 계약금액: {quote.final_total.toLocaleString()}원
                </Alert>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                정산 스케줄 프리셋
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {Object.entries(settlementPresets).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outlined"
                    size="small"
                    onClick={() => applyPreset(key as keyof typeof settlementPresets)}
                  >
                    {preset.name}
                  </Button>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addSettlementItem}
                  size="small"
                >
                  항목 추가
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>구분</TableCell>
                    <TableCell align="right">비율 (%)</TableCell>
                    <TableCell align="right">금액 (원)</TableCell>
                    <TableCell>예정일</TableCell>
                    <TableCell align="center">삭제</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.settlement_schedule.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <TextField
                          value={item.description}
                          onChange={(e) => updateSettlementItem(item.id, 'description', e.target.value)}
                          size="small"
                          variant="standard"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.percentage}
                          onChange={(e) => updateSettlementItem(item.id, 'percentage', parseFloat(e.target.value) || 0)}
                          size="small"
                          variant="standard"
                          inputProps={{ min: 0, max: 100, step: 0.1 }}
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateSettlementItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          size="small"
                          variant="standard"
                          inputProps={{ min: 0, step: 10000 }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          value={item.due_date ? item.due_date.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateSettlementItem(item.id, 'due_date', e.target.value ? new Date(e.target.value) : new Date())}
                          size="small"
                          variant="standard"
                          sx={{ width: 120 }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          onClick={() => removeSettlementItem(item.id)}
                          disabled={formData.settlement_schedule.length <= 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell><strong>합계</strong></TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${getTotalPercentage().toFixed(1)}%`}
                        color={Math.abs(getTotalPercentage() - 100) < 0.1 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <strong>{getTotalAmount().toLocaleString()}원</strong>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {Math.abs(getTotalPercentage() - 100) >= 0.1 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                정산 비율 합계가 100%가 아닙니다. (현재: {getTotalPercentage().toFixed(1)}%)
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              프로젝트 전환 정보 확인
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">
                  프로젝트 기본정보
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>프로젝트명:</strong> {formData.project_name}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>기간:</strong> {formData.start_date?.toLocaleDateString('ko-KR')} ~ {formData.end_date?.toLocaleDateString('ko-KR')}
                </Typography>
                <Typography variant="body1">
                  <strong>총 계약금액:</strong> {quote.final_total.toLocaleString()}원
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  정산 스케줄 ({formData.settlement_schedule.length}단계)
                </Typography>
                {formData.settlement_schedule.map((item, index) => (
                  <Box key={item.id} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {index + 1}. {item.description}: {item.amount.toLocaleString()}원 ({item.percentage}%) 
                      - {item.due_date.toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mt: 2 }}>
              위 정보로 프로젝트를 생성하고 정산 내역을 등록합니다. 
              생성 후에는 프로젝트 관리 화면에서 진행률을 추적할 수 있습니다.
            </Alert>
          </Box>
        );

      default:
        return '알 수 없는 단계입니다.';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon color="primary" />
          프로젝트 전환
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent(activeStep)}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          취소
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            이전
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid(activeStep)}
          >
            다음
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleConvert}
            disabled={!isStepValid(activeStep) || converting}
            startIcon={converting ? <CircularProgress size={16} /> : undefined}
          >
            {converting ? '생성 중...' : '프로젝트 생성'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}