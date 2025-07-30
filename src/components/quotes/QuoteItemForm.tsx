'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  Button,
  Collapse,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { QuoteItemFormData } from '@/types';
import QuoteDetailForm from './QuoteDetailForm';

interface QuoteItemFormProps {
  item: QuoteItemFormData;
  itemIndex: number;
  groupIndex: number;
  showCostPrice: boolean;
  onUpdate: (itemIndex: number, updates: Partial<QuoteItemFormData>) => void;
  onRemove: (itemIndex: number) => void;
}

export default function QuoteItemForm({
  item,
  itemIndex,
  groupIndex,
  showCostPrice,
  onUpdate,
  onRemove,
}: QuoteItemFormProps) {
  const [expanded, setExpanded] = useState(true);

  const handleUpdate = (updates: Partial<QuoteItemFormData>) => {
    onUpdate(itemIndex, updates);
  };

  const addDetail = () => {
    const newDetail = {
      id: `temp-detail-${Date.now()}`,
      name: '',
      description: '',
      quantity: 1,
      days: 1,
      unit: 'EA',
      unit_price: 0,
      is_service: false,
      cost_price: 0,
      supplier_id: '',
      supplier_name_snapshot: '',
    };
    handleUpdate({
      details: [...item.details, newDetail],
    });
  };

  const updateDetail = (detailIndex: number, updates: any) => {
    const newDetails = [...item.details];
    newDetails[detailIndex] = { ...newDetails[detailIndex], ...updates };
    handleUpdate({ details: newDetails });
  };

  const removeDetail = (detailIndex: number) => {
    const newDetails = item.details.filter((_, index) => index !== detailIndex);
    handleUpdate({ details: newDetails });
  };

  // 품목 총액 계산
  const calculateItemTotal = () => {
    return item.details.reduce((total, detail) => {
      const detailAmount = detail.is_service
        ? detail.quantity * detail.unit_price
        : detail.quantity * detail.days * detail.unit_price;
      return total + detailAmount;
    }, 0);
  };

  return (
    <Card
      variant='outlined'
      sx={{
        mb: 1,
        ml: 2,
        backgroundColor: 'grey.50',
        border: '1px solid',
        borderColor: 'grey.300',
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        {/* 품목 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size='small'
            sx={{ mr: 1 }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>

          <TextField
            size='small'
            label='품목명'
            value={item.name}
            onChange={(e) => handleUpdate({ name: e.target.value })}
            sx={{ flexGrow: 1, mr: 2 }}
            variant='standard'
          />

          <FormControlLabel
            control={
              <Switch
                checked={item.include_in_fee}
                onChange={(e) =>
                  handleUpdate({ include_in_fee: e.target.checked })
                }
                size='small'
              />
            }
            label='수수료 포함'
            sx={{ mr: 2 }}
          />

          <Typography
            variant='body2'
            sx={{ mr: 2, minWidth: 100, textAlign: 'right' }}
          >
            ₩{calculateItemTotal().toLocaleString()}
          </Typography>

          <IconButton
            onClick={() => onRemove(itemIndex)}
            color='error'
            size='small'
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        {/* 품목 내용 */}
        <Collapse in={expanded}>
          <Box sx={{ ml: 4 }}>
            {/* 세부내용 추가 버튼 */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant='text'
                startIcon={<AddIcon />}
                onClick={addDetail}
                size='small'
              >
                세부내용 추가
              </Button>
            </Box>

            {/* 세부내용 목록 */}
            {item.details.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 1,
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                }}
              >
                세부내용을 추가해주세요.
              </Box>
            ) : (
              item.details.map((detail, detailIndex) => (
                <QuoteDetailForm
                  key={detailIndex}
                  detail={detail}
                  detailIndex={detailIndex}
                  itemIndex={itemIndex}
                  groupIndex={groupIndex}
                  showCostPrice={showCostPrice}
                  onUpdate={updateDetail}
                  onRemove={removeDetail}
                />
              ))
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
