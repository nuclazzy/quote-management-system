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
  Autocomplete 
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon, 
  Settings as SettingsIcon 
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSafe } from '@/hooks/useMotionsenseQuote-safe';
import { useState } from 'react';
import MasterItemSelector from '@/components/quotes/MasterItemSelector';
import TemplateSelector from '@/components/quotes/TemplateSelector';
import { MasterItem } from '@/types/motionsense-quote';

export default function QuoteNewPage() {
  const router = useRouter();
  
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
    masterItems,
    applyTemplate,
    suppliers
  } = useMotionsenseQuoteSafe();

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          새 견적서 작성
        </Typography>
        <Typography variant="body1" color="text.secondary">
          모션센스 견적서를 작성합니다.
        </Typography>
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
                          sx={{ mr: 2, whiteSpace: 'nowrap' }}
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
                                  {/* 항목 헤더 */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                      label="항목명"
                                      value={item.name}
                                      onChange={(e) => updateItem?.(groupIndex, itemIndex, { name: e.target.value })}
                                      size="small"
                                      sx={{ flexGrow: 1 }}
                                    />
                                    <Button
                                      variant="outlined"
                                      startIcon={<AddIcon />}
                                      onClick={() => addDetail?.(groupIndex, itemIndex)}
                                      size="small"
                                      sx={{ 
                                        boxShadow: 'none',
                                        '&:hover': { boxShadow: 'none' }
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
                                        '&:hover': { boxShadow: 'none' }
                                      }}
                                    >
                                      품목선택
                                    </Button>
                                    <IconButton
                                      onClick={() => toggleItemExpansion(groupIndex, itemIndex)}
                                      size="small"
                                    >
                                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                    <IconButton
                                      onClick={() => removeItem?.(groupIndex, itemIndex)}
                                      size="small"
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
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
                                                
                                                {/* 첫 번째 행: 수량, 일수, 단위 */}
                                                <Grid item xs={4}>
                                                  <TextField
                                                    label="수량"
                                                    type="number"
                                                    value={detail.quantity}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { quantity: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ min: 0, step: 0.1 }}
                                                  />
                                                </Grid>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    label="일수"
                                                    type="number"
                                                    value={detail.days}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { days: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ min: 0, step: 0.5 }}
                                                  />
                                                </Grid>
                                                <Grid item xs={4}>
                                                  <TextField
                                                    label="단위"
                                                    value={detail.unit}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit: e.target.value })}
                                                    size="small"
                                                    fullWidth
                                                    placeholder="개"
                                                  />
                                                </Grid>
                                                
                                                {/* 두 번째 행: 단가, 원가 관리 정보 */}
                                                <Grid item xs={formData?.show_cost_management ? 6 : 12}>
                                                  <TextField
                                                    label="단가"
                                                    type="number"
                                                    value={detail.unit_price}
                                                    onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit_price: Number(e.target.value) || 0 })}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ min: 0, step: 1000 }}
                                                  />
                                                </Grid>
                                                
                                                {formData?.show_cost_management && (
                                                  <Grid item xs={6}>
                                                    <TextField
                                                      label="원가"
                                                      type="number"
                                                      value={detail.cost_price || 0}
                                                      onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { cost_price: Number(e.target.value) || 0 })}
                                                      size="small"
                                                      fullWidth
                                                      inputProps={{ min: 0, step: 1000 }}
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
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
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
                  inputProps={{ min: 0, step: 1000 }}
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

          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'white', position: 'sticky', top: 20, p: 3 }}>
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
                variant="contained" 
                fullWidth 
                disabled
                sx={{ 
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                저장하기
              </Button>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => router.push('/quotes')}
                sx={{ 
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                취소
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
        masterItems={masterItems}
      />
    </Container>
  );
}