'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { QuoteTemplatesService } from '@/lib/services/quote-templates';
import { MotionsenseQuote } from '@/types/motionsense-quote';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  quoteData: MotionsenseQuote;
  onSuccess?: () => void;
}

const CATEGORIES = [
  '영상제작',
  '촬영',
  '그래픽디자인',
  '개발',
  '마케팅',
  '이벤트',
  '기타',
];

export default function SaveAsTemplateDialog({
  open,
  onClose,
  quoteData,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('템플릿명을 입력해주세요.');
      return;
    }

    if (!category) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 견적서 데이터에서 템플릿 데이터 추출
      const templateData = {
        groups: quoteData.groups.map(group => ({
          name: group.name,
          include_in_fee: group.include_in_fee,
          items: group.items.map(item => ({
            name: item.name,
            include_in_fee: item.include_in_fee,
            details: item.details.map(detail => ({
              name: detail.name,
              quantity: detail.quantity,
              days: detail.days,
              unit_price: detail.unit_price,
            })),
          })),
        })),
      };

      // 템플릿 저장
      await QuoteTemplatesService.create({
        name: templateName.trim(),
        description: description.trim() || undefined,
        category,
        template_data: templateData,
      });

      // 성공 처리
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (err) {
      console.error('템플릿 저장 오류:', err);
      setError(err instanceof Error ? err.message : '템플릿 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTemplateName('');
    setDescription('');
    setCategory('');
    setError(null);
    onClose();
  };

  // 템플릿 미리보기 정보
  const previewInfo = {
    groupCount: quoteData.groups.length,
    totalItems: quoteData.groups.reduce(
      (acc, group) => acc + group.items.reduce(
        (itemAcc, item) => itemAcc + item.details.length, 0
      ), 0
    ),
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>현재 견적서를 템플릿으로 저장</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="템플릿명"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            fullWidth
            required
            helperText="템플릿을 구분할 수 있는 이름을 입력하세요"
            disabled={loading}
          />

          <FormControl fullWidth required>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="카테고리"
              disabled={loading}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="템플릿에 대한 설명을 입력하세요 (선택사항)"
            disabled={loading}
          />

          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              템플릿 미리보기
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {previewInfo.groupCount}개 그룹
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 총 {previewInfo.totalItems}개 항목
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 프로젝트명: {quoteData.project_title}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          취소
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !templateName.trim() || !category}
        >
          {loading ? '저장 중...' : '템플릿으로 저장'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}