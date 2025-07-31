'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  preview_groups: Array<{
    name: string;
    item_count: number;
  }>;
  estimated_total: number;
}

interface TemplateSelectorProps {
  onApplyTemplate: (template: QuoteTemplate) => void;
}

const DUMMY_TEMPLATES: QuoteTemplate[] = [
  {
    id: '1',
    name: '기본 영상 제작',
    description: '일반적인 기업 홍보 영상 제작 템플릿',
    category: '영상제작',
    preview_groups: [
      { name: '기획/스토리보드', item_count: 3 },
      { name: '촬영', item_count: 2 },
      { name: '편집/후반작업', item_count: 4 }
    ],
    estimated_total: 3500000
  },
  {
    id: '2',
    name: '제품 촬영 패키지',
    description: '제품 사진 및 영상 촬영 전문 패키지',
    category: '촬영',
    preview_groups: [
      { name: '제품 촬영', item_count: 3 },
      { name: '스튜디오 대여', item_count: 1 },
      { name: '후반 보정', item_count: 2 }
    ],
    estimated_total: 1200000
  },
  {
    id: '3',
    name: '인포그래픽 제작',
    description: '데이터 시각화 및 인포그래픽 디자인',
    category: '그래픽디자인',
    preview_groups: [
      { name: '컨셉 디자인', item_count: 2 },
      { name: '인포그래픽 제작', item_count: 5 },
      { name: '애니메이션', item_count: 3 }
    ],
    estimated_total: 2800000
  },
  {
    id: '4',
    name: '웹사이트 개발',
    description: '기업 웹사이트 구축 및 개발',
    category: '개발',
    preview_groups: [
      { name: '기획/설계', item_count: 4 },
      { name: '디자인', item_count: 6 },
      { name: '개발/구축', item_count: 8 }
    ],
    estimated_total: 8500000
  }
];

export default function TemplateSelector({ onApplyTemplate }: TemplateSelectorProps) {
  const theme = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleTemplateSelect = (template: QuoteTemplate) => {
    setSelectedTemplate(template);
    setConfirmDialog(true);
  };

  const handleConfirmApply = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
    }
    setConfirmDialog(false);
    setSelectedTemplate(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '영상제작': return 'primary';
      case '촬영': return 'secondary';
      case '그래픽디자인': return 'success';
      case '개발': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            견적서 템플릿 선택
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            미리 구성된 템플릿을 선택하여 빠르게 견적서를 작성하세요.
          </Typography>
          
          <Grid container spacing={2}>
            {DUMMY_TEMPLATES.map((template) => (
              <Grid item xs={12} sm={6} md={3} key={template.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {template.name}
                      </Typography>
                      <Chip 
                        label={template.category} 
                        size="small" 
                        color={getCategoryColor(template.category) as any}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                      {template.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      {template.preview_groups.map((group, index) => (
                        <Typography key={index} variant="caption" display="block" color="text.secondary">
                          • {group.name} ({group.item_count}개 항목)
                        </Typography>
                      ))}
                    </Box>
                    
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">
                      예상 금액: {template.estimated_total.toLocaleString()}원
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* 템플릿 적용 확인 다이얼로그 */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>
          템플릿 적용 확인
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            <strong>{selectedTemplate?.name}</strong> 템플릿을 적용하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            현재 작성 중인 내용이 있다면 템플릿으로 대체됩니다.
          </Typography>
          
          {selectedTemplate && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                포함될 그룹:
              </Typography>
              {selectedTemplate.preview_groups.map((group, index) => (
                <Typography key={index} variant="body2">
                  • {group.name} ({group.item_count}개 항목)
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>
            취소
          </Button>
          <Button onClick={handleConfirmApply} variant="contained">
            적용하기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}