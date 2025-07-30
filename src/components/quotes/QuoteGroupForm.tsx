'use client';

import React, { useState, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  Button,
  Collapse,
  Divider,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { QuoteGroupFormData } from '@/types';
import QuoteItemForm from './QuoteItemForm';

interface QuoteGroupFormProps {
  group: QuoteGroupFormData;
  groupIndex: number;
  showCostPrice: boolean;
  onUpdate: (groupIndex: number, updates: Partial<QuoteGroupFormData>) => void;
  onRemove: (groupIndex: number) => void;
}

const QuoteGroupForm = memo(function QuoteGroupForm({
  group,
  groupIndex,
  showCostPrice,
  onUpdate,
  onRemove,
}: QuoteGroupFormProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(true);

  const handleUpdate = (updates: Partial<QuoteGroupFormData>) => {
    onUpdate(groupIndex, updates);
  };

  const addItem = () => {
    const newItem = {
      id: `temp-item-${Date.now()}`,
      name: '새 품목',
      sort_order: group.items.length,
      include_in_fee: true,
      details: [],
    };
    handleUpdate({
      items: [...group.items, newItem],
    });
  };

  const updateItem = (itemIndex: number, updates: any) => {
    const newItems = [...group.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    handleUpdate({ items: newItems });
  };

  const removeItem = (itemIndex: number) => {
    const newItems = group.items.filter((_, index) => index !== itemIndex);
    handleUpdate({ items: newItems });
  };

  return (
    <Card
      sx={{
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 1,
        '&:hover': {
          boxShadow: 3,
        },
        transition: 'box-shadow 0.2s ease-in-out',
      }}
    >
      <CardHeader
        avatar={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size='small'
              sx={{
                color: 'text.secondary',
                cursor: 'grab',
                minHeight: 32,
                minWidth: 32,
              }}
              aria-label='그룹 순서 변경'
            >
              <DragIcon />
            </IconButton>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ fontWeight: 500 }}
            >
              그룹 {groupIndex + 1}
            </Typography>
          </Box>
        }
        action={
          <Stack direction='row' spacing={1} alignItems='center'>
            <Tooltip title={expanded ? '그룹 접기' : '그룹 펼치기'}>
              <IconButton
                onClick={() => setExpanded(!expanded)}
                size='small'
                sx={{ minHeight: 44, minWidth: 44 }}
                aria-label={expanded ? '그룹 접기' : '그룹 펼치기'}
                aria-expanded={expanded}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title='그룹 삭제'>
              <IconButton
                onClick={() => onRemove(groupIndex)}
                color='error'
                size='small'
                sx={{ minHeight: 44, minWidth: 44 }}
                aria-label={`그룹 ${groupIndex + 1} 삭제`}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        sx={{
          pb: 1,
          '& .MuiCardHeader-content': {
            flex: 1,
          },
        }}
      />

      <CardContent sx={{ pt: 0 }}>
        {/* 그룹 기본 정보 */}
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size={isMobile ? 'medium' : 'small'}
            label='그룹명'
            value={group.name}
            onChange={(e) => handleUpdate({ name: e.target.value })}
            required
            inputProps={{
              'aria-label': `그룹 ${groupIndex + 1} 이름`,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={group.include_in_fee}
                onChange={(e) =>
                  handleUpdate({ include_in_fee: e.target.checked })
                }
                inputProps={{
                  'aria-label': `그룹 ${groupIndex + 1} 수수료 포함 여부`,
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  수수료 포함
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  이 그룹의 품목들을 대행수수료 계산에 포함합니다
                </Typography>
              </Box>
            }
            sx={{
              alignItems: 'flex-start',
              '& .MuiFormControlLabel-label': {
                ml: 1,
              },
            }}
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 그룹 내용 */}
        <Collapse in={expanded} timeout='auto' unmountOnExit>
          <Box>
            {/* 품목 추가 버튼 */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant='outlined'
                startIcon={<AddIcon />}
                onClick={addItem}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'primary.50',
                  },
                }}
                aria-label={`그룹 ${groupIndex + 1}에 품목 추가`}
              >
                품목 추가
              </Button>
            </Box>

            {/* 품목 목록 */}
            {group.items.length === 0 ? (
              <Card
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  품목이 없습니다
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  '품목 추가' 버튼을 클릭하여 견적 항목을 추가해보세요
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {group.items.map((item, itemIndex) => (
                  <QuoteItemForm
                    key={`${groupIndex}-${itemIndex}`}
                    item={item}
                    itemIndex={itemIndex}
                    groupIndex={groupIndex}
                    showCostPrice={showCostPrice}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
});

export default QuoteGroupForm;
