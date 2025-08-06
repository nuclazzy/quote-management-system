'use client';

import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
  Preview as PreviewIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useQuote4Tier } from '@/hooks/useQuote4Tier';
import { Quote4TierService } from '@/lib/services/quote-4tier-service';
import QuoteGroupForm from '@/components/quotes/QuoteGroupForm';
import QuoteCalculationSummary from '@/components/quotes/QuoteCalculationSummary';
import { formatCurrency } from '@/utils/format';
import MasterItemSelector4Tier from '@/components/quotes/MasterItemSelector4Tier';

export default function Quote4TierNewPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [masterItemSelectorOpen, setMasterItemSelectorOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const {
    formData,
    calculation,
    isValid,
    isDirty,
    updateFormData,
    addGroup,
    removeGroup,
    addItem,
    removeItem,
    updateItem,
    addDetail,
    addDetailFromMaster,
    removeDetail,
    updateDetail,
    resetForm
  } = useQuote4Tier({ autoCalculate: true, debounceMs: 300 });

  // 견적서 저장
  const handleSave = useCallback(async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const result = await Quote4TierService.createQuote(formData);
      if (result.success && result.data) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push(`/quotes/${result.data!.id}`);
        }, 1500);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '견적서 저장에 실패했습니다.');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isValid, router]);

  // 페이지 떠날 때 확인
  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      router.back();
    }
  }, [isDirty, router]);

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedDialog(false);
    router.back();
  }, [router]);

  // 마스터 품목 선택기 열기
  const handleOpenMasterItemSelector = useCallback((groupIndex: number, itemIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setSelectedItemIndex(itemIndex);
    setMasterItemSelectorOpen(true);
  }, []);

  // 마스터 품목에서 스냅샷 추가
  const handleAddFromMasterItem = useCallback(async (masterItemId: string, quantity: number = 1, days: number = 1) => {
    try {
      await addDetailFromMaster(selectedGroupIndex, selectedItemIndex, masterItemId);
      // 추가된 세부내용의 수량과 일수 업데이트
      const lastDetailIndex = formData.groups[selectedGroupIndex].items[selectedItemIndex].details.length;
      updateDetail(selectedGroupIndex, selectedItemIndex, lastDetailIndex, { quantity, days });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '마스터 품목 추가에 실패했습니다.');
      setShowError(true);
    }
  }, [selectedGroupIndex, selectedItemIndex, addDetailFromMaster, formData.groups, updateDetail]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            뒤로
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            새 견적서 작성 (4단계 구조)
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isValid || isSubmitting}
            sx={{ ml: 2 }}
          >
            {isSubmitting ? '저장 중...' : '견적서 저장'}
          </Button>
        </Box>
        
        {isSubmitting && <LinearProgress />}
        
        <Alert severity="info" sx={{ mb: 2 }}>
          4단계 견적서 구조: 견적서 → 그룹 → 품목 → 세부내용
          <br />
          마스터 품목을 추가하면 현재 정보가 스냅샷으로 저장됩니다.
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* 기본 정보 입력 */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              기본 정보
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="프로젝트 제목"
                  value={formData.project_title}
                  onChange={(e) => updateFormData({ project_title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="고객사명"
                  value={formData.customer_name_snapshot}
                  onChange={(e) => updateFormData({ customer_name_snapshot: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="견적일"
                  value={formData.issue_date}
                  onChange={(e) => updateFormData({ issue_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="대행 수수료율 (%)"
                  value={formData.agency_fee_rate * 100}
                  onChange={(e) => updateFormData({ 
                    agency_fee_rate: parseFloat(e.target.value || '0') / 100 
                  })}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>VAT 처리</InputLabel>
                  <Select
                    value={formData.vat_type}
                    onChange={(e) => updateFormData({ 
                      vat_type: e.target.value as 'exclusive' | 'inclusive' 
                    })}
                  >
                    <MenuItem value="exclusive">별도</MenuItem>
                    <MenuItem value="inclusive">포함</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="할인 금액"
                  value={formData.discount_amount}
                  onChange={(e) => updateFormData({ 
                    discount_amount: parseFloat(e.target.value || '0') 
                  })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* 4단계 구조 */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                견적 구성 ({formData.groups.length}개 그룹)
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => addGroup('새 그룹')}
                variant="outlined"
                size="small"
              >
                그룹 추가
              </Button>
            </Box>

            {formData.groups.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                최소 1개 이상의 그룹이 필요합니다.
              </Alert>
            )}

            {formData.groups.map((group, groupIndex) => (
              <Card key={groupIndex} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TextField
                      size="small"
                      label="그룹명"
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = [...formData.groups];
                        newGroups[groupIndex] = { ...group, name: e.target.value };
                        updateFormData({ groups: newGroups });
                      }}
                      sx={{ flexGrow: 1, mr: 1 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={group.include_in_fee}
                          onChange={(e) => {
                            const newGroups = [...formData.groups];
                            newGroups[groupIndex] = { ...group, include_in_fee: e.target.checked };
                            updateFormData({ groups: newGroups });
                          }}
                        />
                      }
                      label="수수료 적용"
                      sx={{ mr: 1 }}
                    />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeGroup(groupIndex)}
                    >
                      삭제
                    </Button>
                  </Box>

                  {/* 품목들 */}
                  {group.items.map((item, itemIndex) => (
                    <Box key={itemIndex} sx={{ ml: 2, mb: 2, p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          size="small"
                          label="품목명"
                          value={item.name}
                          onChange={(e) => updateItem(groupIndex, itemIndex, { name: e.target.value })}
                          sx={{ flexGrow: 1, mr: 1 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={item.include_in_fee}
                              onChange={(e) => updateItem(groupIndex, itemIndex, { include_in_fee: e.target.checked })}
                            />
                          }
                          label="수수료 적용"
                          sx={{ mr: 1 }}
                        />
                        <Button
                          size="small"
                          onClick={() => addDetail(groupIndex, itemIndex)}
                          sx={{ mr: 1 }}
                        >
                          빈 항목 추가
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleOpenMasterItemSelector(groupIndex, itemIndex)}
                          variant="outlined"
                          sx={{ mr: 1 }}
                        >
                          마스터 품목 추가
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeItem(groupIndex, itemIndex)}
                        >
                          삭제
                        </Button>
                      </Box>

                      {/* 세부내용들 */}
                      {item.details.map((detail, detailIndex) => (
                        <Box key={detailIndex} sx={{ ml: 2, mb: 1, p: 1, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item xs={12} sm={3}>
                              <TextField
                                size="small"
                                fullWidth
                                label="세부내용명"
                                value={detail.name}
                                onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { name: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label="수량"
                                value={detail.quantity}
                                onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { quantity: parseFloat(e.target.value || '1') })}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label="일수"
                                value={detail.days}
                                onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { days: parseFloat(e.target.value || '1') })}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                label="단위"
                                value={detail.unit}
                                onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { unit: e.target.value })}
                              />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                size="small"
                                fullWidth
                                type="number"
                                label="단가"
                                value={detail.unit_price}
                                onChange={(e) => updateDetail(groupIndex, itemIndex, detailIndex, { unit_price: parseFloat(e.target.value || '0') })}
                              />
                            </Grid>
                            <Grid item xs={12} sm={1}>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => removeDetail(groupIndex, itemIndex, detailIndex)}
                                sx={{ minWidth: 'auto' }}
                              >
                                ×
                              </Button>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Box>
                  ))}

                  <Box sx={{ ml: 2 }}>
                    <Button
                      size="small"
                      onClick={() => addItem(groupIndex, '새 품목')}
                      startIcon={<AddIcon />}
                    >
                      품목 추가
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>

        {/* 계산 결과 */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              견적 금액
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>소계:</Typography>
                <Typography>{formatCurrency(calculation.subtotal)}</Typography>
              </Box>
              
              {calculation.agency_fee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>대행 수수료:</Typography>
                  <Typography>{formatCurrency(calculation.agency_fee)}</Typography>
                </Box>
              )}
              
              {calculation.discount_amount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'error.main' }}>
                  <Typography>할인:</Typography>
                  <Typography>-{formatCurrency(calculation.discount_amount)}</Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>VAT ({formData.vat_type === 'exclusive' ? '별도' : '포함'}):</Typography>
                <Typography>{formatCurrency(calculation.vat_amount)}</Typography>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">총액:</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(calculation.final_total)}
                </Typography>
              </Box>
            </Box>

            {formData.show_cost_management && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>원가 관리</Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">총 원가:</Typography>
                  <Typography variant="body2">{formatCurrency(calculation.total_cost)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">예상 이익:</Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(calculation.total_profit)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">이익률:</Typography>
                  <Typography variant="body2" color="success.main">
                    {calculation.profit_margin_percentage.toFixed(1)}%
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 성공 메시지 */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          견적서가 성공적으로 저장되었습니다!
        </Alert>
      </Snackbar>

      {/* 에러 메시지 */}
      <Snackbar
        open={showError}
        autoHideDuration={5000}
        onClose={() => setShowError(false)}
      >
        <Alert severity="error" onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* 미저장 확인 다이얼로그 */}
      <Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
        <DialogTitle>미저장된 변경사항</DialogTitle>
        <DialogContent>
          저장하지 않은 변경사항이 있습니다. 정말로 페이지를 떠나시겠습니까?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnsavedDialog(false)}>
            취소
          </Button>
          <Button onClick={handleConfirmLeave} color="error">
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 마스터 품목 선택기 */}
      <MasterItemSelector4Tier
        open={masterItemSelectorOpen}
        onClose={() => setMasterItemSelectorOpen(false)}
        onSelect={handleAddFromMasterItem}
        groupIndex={selectedGroupIndex}
        itemIndex={selectedItemIndex}
      />
    </Container>
  );
}