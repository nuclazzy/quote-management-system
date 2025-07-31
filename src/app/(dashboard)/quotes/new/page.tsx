'use client';

import { Container, Typography, Button, Box, TextField, Card, CardContent, Grid, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Collapse } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSafe } from '@/hooks/useMotionsenseQuote-safe';
import { useState } from 'react';
import MasterItemSelector from '@/components/quotes/MasterItemSelector';
import TemplateSelector from '@/components/quotes/TemplateSelector';
import { MasterItem } from '@/types/motionsense-quote';

export default function QuoteNewPage() {
  const router = useRouter();
  
  // 펼침/접힘 상태 관리
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
    applyTemplate
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
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* 견적 그룹 섹션 */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  견적 항목
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addGroup?.('새 그룹')}
                  size="small"
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
                    <Card key={groupIndex} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
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
                          <Box>
                            <Button
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => addItem?.(groupIndex, '새 항목')}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              항목 추가
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => removeGroup?.(groupIndex)}
                              size="small"
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
                              const isExpanded = expandedItems[key];
                              
                              return (
                                <Card key={itemIndex} variant="outlined" sx={{ mb: 1 }}>
                                  <CardContent sx={{ pb: 1 }}>
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
                                      >
                                        직접입력
                                      </Button>
                                      <Button
                                        variant="contained"
                                        onClick={() => openMasterItemDialog(groupIndex, itemIndex)}
                                        size="small"
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
                                          <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow>
                                                  <TableCell>품목명</TableCell>
                                                  <TableCell align="center">수량</TableCell>
                                                  <TableCell align="center">일수</TableCell>
                                                  <TableCell align="center">단위</TableCell>
                                                  <TableCell align="right">단가</TableCell>
                                                  <TableCell align="right">합계</TableCell>
                                                  <TableCell align="center">삭제</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {item.details?.map((detail, detailIndex) => (
                                                  <TableRow key={detailIndex}>
                                                    <TableCell>
                                                      <TextField
                                                        value={detail.name}
                                                        onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { name: e.target.value })}
                                                        size="small"
                                                        fullWidth
                                                        placeholder="품목명 입력"
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <TextField
                                                        type="number"
                                                        value={detail.quantity}
                                                        onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { quantity: Number(e.target.value) || 0 })}
                                                        size="small"
                                                        sx={{ width: 80 }}
                                                        inputProps={{ min: 0, step: 0.1 }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <TextField
                                                        type="number"
                                                        value={detail.days}
                                                        onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { days: Number(e.target.value) || 0 })}
                                                        size="small"
                                                        sx={{ width: 80 }}
                                                        inputProps={{ min: 0, step: 0.5 }}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <TextField
                                                        value={detail.unit}
                                                        onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit: e.target.value })}
                                                        size="small"
                                                        sx={{ width: 60 }}
                                                        placeholder="개"
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <TextField
                                                        type="number"
                                                        value={detail.unit_price}
                                                        onChange={(e) => updateDetail?.(groupIndex, itemIndex, detailIndex, { unit_price: Number(e.target.value) || 0 })}
                                                        size="small"
                                                        sx={{ width: 100 }}
                                                        inputProps={{ min: 0, step: 1000 }}
                                                      />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Typography variant="body2" fontWeight="medium">
                                                        {(detail.quantity * detail.days * detail.unit_price).toLocaleString()}원
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                      <IconButton
                                                        onClick={() => removeDetail?.(groupIndex, itemIndex, detailIndex)}
                                                        size="small"
                                                        color="error"
                                                      >
                                                        <DeleteIcon />
                                                      </IconButton>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        )}
                                      </Box>
                                    </Collapse>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 계산 결과 사이드바 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
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
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">대행수수료</Typography>
                    <Typography variant="body2">
                      {(calculation?.agency_fee || 0).toLocaleString()}원
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
                </Box>
              )}
              
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="contained" fullWidth disabled>
                  저장하기
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => router.push('/quotes')}
                >
                  취소
                </Button>
              </Box>
            </CardContent>
          </Card>
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