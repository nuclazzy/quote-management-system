'use client';

import { Container, Typography, Button, Box, TextField, Card, CardContent, Grid, Divider } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useMotionsenseQuoteSafe } from '@/hooks/useMotionsenseQuote-safe';

export default function QuoteNewPage() {
  const router = useRouter();
  
  // 안전한 훅 사용
  const { 
    formData, 
    updateFormData, 
    addGroup, 
    removeGroup,
    addItem,
    calculation,
    isCalculating 
  } = useMotionsenseQuoteSafe();

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
                            {group.items?.map((item, itemIndex) => (
                              <Box key={itemIndex} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                                <TextField
                                  label="항목명"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updatedGroups = [...(formData?.groups || [])];
                                    updatedGroups[groupIndex].items[itemIndex] = { ...item, name: e.target.value };
                                    updateFormData?.({ groups: updatedGroups });
                                  }}
                                  size="small"
                                  fullWidth
                                />
                              </Box>
                            ))}
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
    </Container>
  );
}