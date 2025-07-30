'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Autocomplete,
  Button,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Send,
  ArrowBack,
  Receipt,
  Person,
  ShoppingCart,
} from '@mui/icons-material';
import { ModernBackground } from '@/components/layout/ModernBackground';
import { GlassCard } from '@/components/common/GlassCard';
import { LoadingState } from '@/components/common/LoadingState';
import { formatCurrency } from '@/utils/format';

// 임시 타입 정의
interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  price: number;
  category?: string;
}

interface QuoteItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const steps = ['고객 정보', '견적 항목', '최종 확인'];

export default function NewQuotePage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 폼 데이터
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  
  // 데이터 로딩 상태
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 임시 더미 데이터 - 실제로는 API에서 가져옴
        setClients([
          { id: '1', name: '(주)모션센스', email: 'info@motionsense.co.kr', phone: '02-1234-5678' },
          { id: '2', name: '삼성전자', email: 'contact@samsung.com', phone: '02-2222-3333' },
          { id: '3', name: 'LG전자', email: 'info@lge.co.kr', phone: '02-3333-4444' },
        ]);

        setItems([
          { id: '1', name: '웹사이트 개발', sku: 'WEB-001', price: 5000000, category: '개발' },
          { id: '2', name: '모바일 앱 개발', sku: 'APP-001', price: 8000000, category: '개발' },
          { id: '3', name: 'UI/UX 디자인', sku: 'DES-001', price: 2000000, category: '디자인' },
          { id: '4', name: '데이터베이스 설계', sku: 'DB-001', price: 3000000, category: '개발' },
        ]);

        // 오늘부터 30일 후를 기본 유효기간으로 설정
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        setValidUntil(futureDate.toISOString().split('T')[0]);
        
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 견적 항목 추가
  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      itemId: '',
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  // 견적 항목 업데이트
  const updateQuoteItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updatedItems = [...quoteItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // 아이템 선택시 이름과 가격 자동 설정
    if (field === 'itemId') {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index].itemName = selectedItem.name;
        updatedItems[index].unitPrice = selectedItem.price;
      }
    }

    // 총액 계산
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setQuoteItems(updatedItems);
  };

  // 견적 항목 삭제
  const removeQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  // 총액 계산
  const totalAmount = quoteItems.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = totalAmount * 0.1;
  const finalAmount = totalAmount + vatAmount;

  // 유효성 검사
  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!selectedClient) newErrors.client = '고객사를 선택해주세요';
      if (!projectTitle.trim()) newErrors.projectTitle = '프로젝트명을 입력해주세요';
      if (!validUntil) newErrors.validUntil = '견적 유효기간을 선택해주세요';
    } else if (step === 1) {
      if (quoteItems.length === 0) newErrors.items = '견적 항목을 최소 1개 이상 추가해주세요';
      quoteItems.forEach((item, index) => {
        if (!item.itemId) newErrors[`item_${index}`] = `${index + 1}번 항목을 선택해주세요`;
        if (item.quantity <= 0) newErrors[`quantity_${index}`] = `${index + 1}번 항목의 수량을 입력해주세요`;
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 다음 단계로
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  // 이전 단계로
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // 견적서 저장
  const handleSave = async (status: 'draft' | 'sent') => {
    if (!validateStep(activeStep)) return;

    setSaving(true);
    try {
      // 실제로는 API 호출
      const quoteData = {
        client_id: selectedClient?.id,
        project_title: projectTitle,
        description,
        valid_until: validUntil,
        items: quoteItems,
        total_amount: finalAmount,
        status,
      };

      console.log('견적서 저장:', quoteData);
      
      // 임시 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 성공시 견적서 목록으로 이동
      router.push('/quotes');
    } catch (error) {
      console.error('견적서 저장 실패:', error);
      alert('견적서 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ModernBackground>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={() => router.push('/quotes')}
              sx={{ mr: 1 }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              새 견적서 작성
            </Typography>
          </Box>
          
          {/* 진행 단계 */}
          <GlassCard sx={{ p: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                          color: activeStep >= index ? 'white' : 'grey.600',
                          fontWeight: 600,
                        }}
                      >
                        {index === 0 && <Person />}
                        {index === 1 && <ShoppingCart />}
                        {index === 2 && <Receipt />}
                      </Box>
                    )}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </GlassCard>
        </Box>

        {/* 에러 알림 */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            폼을 완전히 작성해주세요.
          </Alert>
        )}

        {/* 단계별 내용 */}
        {activeStep === 0 && (
          <GlassCard>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                고객 정보 입력
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name}
                    value={selectedClient}
                    onChange={(_, newValue) => setSelectedClient(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="고객사 선택"
                        required
                        error={!!errors.client}
                        helperText={errors.client}
                        fullWidth
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.email} • {option.phone}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="프로젝트명"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                    error={!!errors.projectTitle}
                    helperText={errors.projectTitle}
                    fullWidth
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="프로젝트 설명"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                    fullWidth
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="견적 유효기간"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    required
                    error={!!errors.validUntil}
                    helperText={errors.validUntil}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        )}

        {activeStep === 1 && (
          <GlassCard>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  견적 항목
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={addQuoteItem}
                  sx={{ borderRadius: 2 }}
                >
                  항목 추가
                </Button>
              </Box>

              {quoteItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    견적 항목이 없습니다
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    "항목 추가" 버튼을 클릭하여 견적 항목을 추가해주세요
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>항목</TableCell>
                        <TableCell align="center">수량</TableCell>
                        <TableCell align="right">단가</TableCell>
                        <TableCell align="right">총액</TableCell>
                        <TableCell align="center">작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quoteItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Autocomplete
                              options={items}
                              getOptionLabel={(option) => option.name}
                              value={items.find(i => i.id === item.itemId) || null}
                              onChange={(_, newValue) => updateQuoteItem(index, 'itemId', newValue?.id || '')}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="항목 선택"
                                  size="small"
                                  error={!!errors[`item_${index}`]}
                                  helperText={errors[`item_${index}`]}
                                />
                              )}
                              sx={{ minWidth: 200 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuoteItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              size="small"
                              inputProps={{ min: 1 }}
                              error={!!errors[`quantity_${index}`]}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateQuoteItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                              size="small"
                              inputProps={{ min: 0 }}
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(item.total)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              onClick={() => removeQuoteItem(index)}
                              size="small"
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {quoteItems.length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Card sx={{ minWidth: 300 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>소계:</Typography>
                        <Typography>{formatCurrency(totalAmount)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>부가세 (10%):</Typography>
                        <Typography>{formatCurrency(vatAmount)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>총액:</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {formatCurrency(finalAmount)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        )}

        {activeStep === 2 && (
          <GlassCard>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                최종 확인
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>고객 정보</Typography>
                      <Typography><strong>고객사:</strong> {selectedClient?.name}</Typography>
                      <Typography><strong>프로젝트:</strong> {projectTitle}</Typography>
                      <Typography><strong>유효기간:</strong> {validUntil}</Typography>
                      {description && (
                        <Typography><strong>설명:</strong> {description}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>견적 요약</Typography>
                      <Typography><strong>항목 수:</strong> {quoteItems.length}개</Typography>
                      <Typography><strong>소계:</strong> {formatCurrency(totalAmount)}</Typography>
                      <Typography><strong>부가세:</strong> {formatCurrency(vatAmount)}</Typography>
                      <Typography variant="h6" color="primary.main">
                        <strong>총액: {formatCurrency(finalAmount)}</strong>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        )}

        {/* 네비게이션 버튼 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            이전
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === steps.length - 1 ? (
              <>
                <Button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  variant="outlined"
                  startIcon={<Save />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  임시저장
                </Button>
                <Button
                  onClick={() => handleSave('sent')}
                  disabled={saving}
                  variant="contained"
                  startIcon={<Send />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  견적서 발송
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                sx={{ borderRadius: 2, px: 3 }}
              >
                다음
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </ModernBackground>
  );
}