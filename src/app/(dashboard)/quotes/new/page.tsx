'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  Autocomplete,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Alert,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Send,
  Add,
  Delete,
  ExpandMore,
  AccountTree,
  Calculate,
  Visibility,
  VisibilityOff,
  Warning,
  CheckCircle,
  Template,
} from '@mui/icons-material';
import { ModernBackground } from '@/components/layout/ModernBackground';
import { GlassCard } from '@/components/common/GlassCard';
import { LoadingState } from '@/components/common/LoadingState';
import { useMotionsenseQuote } from '@/hooks/useMotionsenseQuote';
import { formatCurrency } from '@/utils/format';
import { MasterItem, QuoteTemplate } from '@/types/motionsense-quote';

// 임시 데이터
const mockClients = [
  { id: '1', name: '(주)모션센스', email: 'info@motionsense.co.kr' },
  { id: '2', name: '삼성전자', email: 'contact@samsung.com' },
  { id: '3', name: 'LG전자', email: 'info@lge.co.kr' },
];

const mockMasterItems: MasterItem[] = [
  { id: '1', name: '메인 카메라 촬영', description: '4K 메인 카메라 촬영', default_unit_price: 1000000, default_unit: '일', is_active: true },
  { id: '2', name: '보조 카메라 촬영', description: '보조 카메라 촬영', default_unit_price: 500000, default_unit: '일', is_active: true },
  { id: '3', name: '드론 촬영', description: '드론 항공 촬영', default_unit_price: 800000, default_unit: '반일', is_active: true },
  { id: '4', name: '1차 편집', description: '영상 1차 편집 작업', default_unit_price: 1500000, default_unit: '건', is_active: true },
  { id: '5', name: '최종 편집', description: '영상 최종 편집 작업', default_unit_price: 1000000, default_unit: '건', is_active: true },
];

const mockTemplates: QuoteTemplate[] = [
  {
    id: '1',
    name: '기본 행사 패키지',
    is_active: true,
    template_data: {
      groups: [
        {
          name: '행사 진행',
          include_in_fee: true,
          items: [
            {
              name: '촬영 서비스',
              include_in_fee: true,
              details: [
                { name: '메인 카메라 촬영', quantity: 1, days: 1, unit_price: 1000000 },
                { name: '보조 카메라 촬영', quantity: 1, days: 1, unit_price: 500000 },
              ],
            },
          ],
        },
      ],
    },
  },
];

export default function NewMotionsenseQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 다이얼로그 상태
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [masterItemDialogOpen, setMasterItemDialogOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // 안전한 훅 사용
  const quoteHook = useMotionsenseQuote();
  
  // 안전한 구조 분해
  const {
    formData,
    calculation,
    isDirty,
    isCalculating,
    updateFormData,
    addGroup,
    updateGroup,
    removeGroup,
    addItem,
    updateItem,
    removeItem,
    addDetailFromMaster,
    addDetail,
    updateDetail,
    removeDetail,
    applyTemplate,
    setMasterItems,
  } = quoteHook || {};

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 훅이 제대로 로드되었는지 확인
        if (!quoteHook || !setMasterItems) {
          throw new Error('Quote hook이 제대로 초기화되지 않았습니다.');
        }
        
        // 마스터 데이터 설정
        setMasterItems(mockMasterItems);
        
        // 기본 구조 추가
        if (formData && formData.groups && formData.groups.length === 0 && addGroup) {
          addGroup('행사 진행');
        }
        
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quoteHook, formData, addGroup, setMasterItems]);

  // 고객 선택 핸들러
  const handleClientChange = (client: any) => {
    setSelectedClient(client);
    if (updateFormData) {
      updateFormData({
        customer_id: client?.id || '',
        customer_name_snapshot: client?.name || '',
      });
    }
  };

  // 템플릿 적용
  const handleApplyTemplate = (template: QuoteTemplate) => {
    if (applyTemplate) {
      applyTemplate(template);
      setTemplateDialogOpen(false);
    }
  };

  // 마스터 품목 추가
  const handleAddMasterItem = (masterItem: MasterItem) => {
    if (addDetailFromMaster) {
      addDetailFromMaster(selectedGroupIndex, selectedItemIndex, masterItem);
      setMasterItemDialogOpen(false);
    }
  };

  // 저장
  const handleSave = async (status: 'draft' | 'sent') => {
    setSaving(true);
    try {
      // 실제로는 API 호출
      const quoteData = {
        ...formData,
        status,
      };
      
      console.log('견적서 저장:', quoteData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/quotes');
    } catch (error) {
      console.error('견적서 저장 실패:', error);
      alert('견적서 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return <LoadingState />;
  }

  // 에러 상태
  if (error) {
    return (
      <ModernBackground>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              견적서 페이지 로드 중 오류가 발생했습니다
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mr: 2 }}
            >
              페이지 새로고침
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/quotes')}
            >
              견적서 목록으로
            </Button>
          </Alert>
        </Container>
      </ModernBackground>
    );
  }

  // 훅이 제대로 로드되지 않은 경우
  if (!formData || calculation === undefined) {
    return (
      <ModernBackground>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="warning">
            <Typography variant="h6" gutterBottom>
              견적서 시스템을 초기화하는 중...
            </Typography>
            <Typography variant="body2">
              잠시만 기다려주세요.
            </Typography>
          </Alert>
        </Container>
      </ModernBackground>
    );
  }

  return (
    <ModernBackground>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => router.push('/quotes')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              견적서 작성
            </Typography>
            {isDirty && (
              <Chip 
                label="수정됨" 
                color="warning" 
                size="small" 
                sx={{ ml: 2 }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Template />}
              onClick={() => setTemplateDialogOpen(true)}
            >
              템플릿
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.show_cost_management}
                  onChange={(e) => updateFormData({ show_cost_management: e.target.checked })}
                />
              }
              label="원가 관리"
            />
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* 좌측: 견적서 작성 */}
          <Grid item xs={12} lg={8}>
            {/* 기본 정보 */}
            <GlassCard sx={{ mb: 4 }}>
              <CardHeader 
                title="기본 정보" 
                avatar={<AccountTree color="primary" />}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={mockClients}
                      getOptionLabel={(option) => option.name}
                      value={selectedClient}
                      onChange={(_, newValue) => handleClientChange(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="고객사 선택"
                          required
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="프로젝트명"
                      value={formData.project_title}
                      onChange={(e) => updateFormData({ project_title: e.target.value })}
                      required
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="발행일"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => updateFormData({ issue_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="대행 수수료율 (%)"
                      type="number"
                      value={formData.agency_fee_rate * 100}
                      onChange={(e) => updateFormData({ agency_fee_rate: Number(e.target.value) / 100 })}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="할인 금액"
                      type="number"
                      value={formData.discount_amount}
                      onChange={(e) => updateFormData({ discount_amount: Number(e.target.value) })}
                      inputProps={{ min: 0 }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>

            {/* 견적 구성 */}
            <GlassCard>
              <CardHeader 
                title="견적 구성"
                action={
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => addGroup()}
                    size="small"
                  >
                    그룹 추가
                  </Button>
                }
              />
              <CardContent>
                {formData.groups.map((group, groupIndex) => (
                  <Accordion key={groupIndex} defaultExpanded sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <TextField
                          value={group.name}
                          onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          sx={{ minWidth: 200 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={group.include_in_fee}
                              onChange={(e) => updateGroup(groupIndex, { include_in_fee: e.target.checked })}
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                          label="수수료 포함"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGroup(groupIndex);
                          }}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      {/* 항목들 */}
                      {group.items.map((item, itemIndex) => (
                        <Card key={itemIndex} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <TextField
                                label="항목명"
                                value={item.name}
                                onChange={(e) => updateItem(groupIndex, itemIndex, { name: e.target.value })}
                                size="small"
                                sx={{ minWidth: 200 }}
                              />
                              <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={() => {
                                  setSelectedGroupIndex(groupIndex);
                                  setSelectedItemIndex(itemIndex);
                                  setMasterItemDialogOpen(true);
                                }}
                                size="small"
                              >
                                품목 추가
                              </Button>
                              <IconButton
                                onClick={() => removeItem(groupIndex, itemIndex)}
                                color="error"
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                            
                            {/* 세부내용들 */}
                            {item.details.map((detail, detailIndex) => (
                              <Paper key={detailIndex} sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={3}>
                                    <TextField
                                      label="품목명"
                                      value={detail.name}
                                      onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { name: e.target.value })}
                                      size="small"
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={6} md={1}>
                                    <TextField
                                      label="수량"
                                      type="number"
                                      value={detail.quantity}
                                      onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { quantity: Number(e.target.value) })}
                                      size="small"
                                      inputProps={{ min: 0.1, step: 0.1 }}
                                    />
                                  </Grid>
                                  <Grid item xs={6} md={1}>
                                    <TextField
                                      label="일수"
                                      type="number"
                                      value={detail.days}
                                      onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { days: Number(e.target.value) })}
                                      size="small"
                                      inputProps={{ min: 0.1, step: 0.1 }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <TextField
                                      label="단가"
                                      type="number"
                                      value={detail.unit_price}
                                      onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { unit_price: Number(e.target.value) })}
                                      size="small"
                                      inputProps={{ min: 0 }}
                                    />
                                  </Grid>
                                  
                                  {formData.show_cost_management && (
                                    <Grid item xs={12} md={2}>
                                      <TextField
                                        label="원가"
                                        type="number"
                                        value={detail.cost_price}
                                        onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { cost_price: Number(e.target.value) })}
                                        size="small"
                                        inputProps={{ min: 0 }}
                                      />
                                    </Grid>
                                  )}
                                  
                                  <Grid item xs={12} md={formData.show_cost_management ? 2 : 3}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {formatCurrency(detail.subtotal || 0)}
                                      </Typography>
                                      {formData.show_cost_management && detail.profit_margin !== undefined && (
                                        <Chip
                                          label={`${detail.profit_margin.toFixed(1)}%`}
                                          color={detail.profit_margin < 0 ? 'error' : detail.profit_margin < 10 ? 'warning' : 'success'}
                                          size="small"
                                        />
                                      )}
                                    </Box>
                                  </Grid>
                                  
                                  <Grid item xs={12} md={1}>
                                    <IconButton
                                      onClick={() => removeDetail(groupIndex, itemIndex, detailIndex)}
                                      color="error"
                                      size="small"
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </Paper>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => addItem(groupIndex)}
                        size="small"
                      >
                        항목 추가
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </GlassCard>
          </Grid>

          {/* 우측: 계산 결과 */}
          <Grid item xs={12} lg={4}>
            <GlassCard sx={{ position: 'sticky', top: 20 }}>
              <CardHeader 
                title="견적 요약" 
                avatar={<Calculate color="primary" />}
                action={isCalculating && <Typography variant="caption">계산 중...</Typography>}
              />
              <CardContent>
                {calculation && (
                  <>
                    {/* 그룹별 합계 */}
                    {calculation.groups.map((group, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{group.name}</Typography>
                          {!group.include_in_fee && (
                            <Chip label="수수료 제외" size="small" variant="outlined" />
                          )}
                        </Box>
                        <Typography variant="body2">
                          {formatCurrency(group.subtotal)}
                        </Typography>
                      </Box>
                    ))}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* 계산 내역 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>소계</Typography>
                      <Typography>{formatCurrency(calculation.subtotal)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>대행 수수료 ({(formData.agency_fee_rate * 100).toFixed(1)}%)</Typography>
                      <Typography>{formatCurrency(calculation.agency_fee)}</Typography>
                    </Box>
                    
                    {formData.discount_amount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>할인</Typography>
                        <Typography color="error">-{formatCurrency(formData.discount_amount)}</Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>부가세 (10%)</Typography>
                      <Typography>{formatCurrency(calculation.vat_amount)}</Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>최종 총액</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatCurrency(calculation.final_total)}
                      </Typography>
                    </Box>
                    
                    {/* 수익률 정보 (원가 관리 시) */}
                    {formData.show_cost_management && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Alert 
                          severity={calculation.profit_margin_percentage < 0 ? 'error' : calculation.profit_margin_percentage < 10 ? 'warning' : 'success'}
                          sx={{ mb: 2 }}
                        >
                          <Box>
                            <Typography variant="body2">
                              예상 수익률: <strong>{calculation.profit_margin_percentage.toFixed(1)}%</strong>
                            </Typography>
                            <Typography variant="caption">
                              총 원가: {formatCurrency(calculation.total_cost)}
                            </Typography>
                          </Box>
                        </Alert>
                      </>
                    )}
                    
                    {/* 액션 버튼 */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                        startIcon={<Save />}
                        fullWidth
                      >
                        임시저장
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleSave('sent')}
                        disabled={saving}
                        startIcon={<Send />}
                        fullWidth
                      >
                        발송
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </GlassCard>
          </Grid>
        </Grid>

        {/* 템플릿 선택 다이얼로그 */}
        <Dialog 
          open={templateDialogOpen} 
          onClose={() => setTemplateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>견적서 템플릿 선택</DialogTitle>
          <DialogContent>
            <List>
              {mockTemplates.map((template) => (
                <ListItemButton
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                >
                  <ListItemText
                    primary={template.name}
                    secondary={`${template.template_data.groups.length}개 그룹`}
                  />
                </ListItemButton>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>취소</Button>
          </DialogActions>
        </Dialog>

        {/* 마스터 품목 선택 다이얼로그 */}
        <Dialog 
          open={masterItemDialogOpen} 
          onClose={() => setMasterItemDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>품목 선택</DialogTitle>
          <DialogContent>
            <List>
              {mockMasterItems.map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => handleAddMasterItem(item)}
                >
                  <ListItemText
                    primary={item.name}
                    secondary={`${formatCurrency(item.default_unit_price)} / ${item.default_unit}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMasterItemDialogOpen(false)}>취소</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ModernBackground>
  );
}