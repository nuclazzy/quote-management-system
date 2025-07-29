'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import { QuoteDetailFormData, MasterItem, Supplier } from '@/types'
import { QuoteService } from '@/lib/services/quote-service'

interface QuoteDetailFormProps {
  detail: QuoteDetailFormData
  detailIndex: number
  itemIndex: number
  groupIndex: number
  showCostPrice: boolean
  onUpdate: (detailIndex: number, updates: Partial<QuoteDetailFormData>) => void
  onRemove: (detailIndex: number) => void
}

export default function QuoteDetailForm({
  detail,
  detailIndex,
  itemIndex,
  groupIndex,
  showCostPrice,
  onUpdate,
  onRemove,
}: QuoteDetailFormProps) {
  const [masterItems, setMasterItems] = useState<MasterItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [masterItemList, supplierList] = await Promise.all([
          QuoteService.getMasterItems(),
          QuoteService.getSuppliers()
        ])
        setMasterItems(masterItemList)
        setSuppliers(supplierList)
      } catch (error) {
        console.error('데이터 로드 실패:', error)
      }
    }
    loadData()
  }, [])

  const handleUpdate = (updates: Partial<QuoteDetailFormData>) => {
    onUpdate(detailIndex, updates)
  }

  // 마스터 품목 선택 시 정보 자동 입력
  const handleMasterItemSelect = (masterItem: MasterItem | null) => {
    if (masterItem) {
      handleUpdate({
        name: masterItem.name,
        description: masterItem.description || '',
        unit: masterItem.default_unit,
        unit_price: masterItem.default_unit_price,
      })
    }
  }

  // 공급처 선택 시 정보 자동 입력
  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    handleUpdate({
      supplier_id: supplierId,
      supplier_name_snapshot: supplier?.name || ''
    })
  }

  // 세부내용 총액 계산
  const calculateDetailTotal = () => {
    return detail.is_service 
      ? detail.quantity * detail.unit_price
      : detail.quantity * detail.days * detail.unit_price
  }

  // 세부내용 복사
  const handleCopy = () => {
    // 부모 컴포넌트에서 처리하도록 이벤트 발생
    // 여기서는 콘솔에만 출력
    console.log('세부내용 복사:', detail)
  }

  return (
    <Box
      sx={{
        p: 2,
        mb: 1,
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1,
        backgroundColor: 'white',
        position: 'relative'
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* 품목명 및 마스터 품목 선택 */}
        <Grid item xs={12} md={3}>
          <Autocomplete
            size="small"
            options={masterItems}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="품목명"
                value={detail.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
              />
            )}
            onChange={(_, value) => handleMasterItemSelect(value)}
            freeSolo
          />
        </Grid>

        {/* 설명 */}
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            size="small"
            label="설명"
            value={detail.description || ''}
            onChange={(e) => handleUpdate({ description: e.target.value })}
          />
        </Grid>

        {/* 수량 */}
        <Grid item xs={6} md={1}>
          <TextField
            fullWidth
            size="small"
            label="수량"
            type="number"
            value={detail.quantity}
            onChange={(e) => handleUpdate({ quantity: parseFloat(e.target.value) || 0 })}
            inputProps={{ min: 0, step: 0.1 }}
          />
        </Grid>

        {/* 일수 (서비스가 아닌 경우에만) */}
        {!detail.is_service && (
          <Grid item xs={6} md={1}>
            <TextField
              fullWidth
              size="small"
              label="일수"
              type="number"
              value={detail.days}
              onChange={(e) => handleUpdate({ days: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>
        )}

        {/* 단위 */}
        <Grid item xs={6} md={1}>
          <FormControl fullWidth size="small">
            <InputLabel>단위</InputLabel>
            <Select
              value={detail.unit}
              onChange={(e) => handleUpdate({ unit: e.target.value })}
              label="단위"
            >
              <MenuItem value="EA">EA</MenuItem>
              <MenuItem value="일">일</MenuItem>
              <MenuItem value="식">식</MenuItem>
              <MenuItem value="편">편</MenuItem>
              <MenuItem value="명">명</MenuItem>
              <MenuItem value="대">대</MenuItem>
              <MenuItem value="개">개</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* 단가 */}
        <Grid item xs={6} md={1.5}>
          <TextField
            fullWidth
            size="small"
            label="단가"
            type="number"
            value={detail.unit_price}
            onChange={(e) => handleUpdate({ unit_price: parseFloat(e.target.value) || 0 })}
            inputProps={{ min: 0, step: 1000 }}
          />
        </Grid>

        {/* 원가 (내부 원가 표시 시에만) */}
        {showCostPrice && (
          <Grid item xs={6} md={1.5}>
            <TextField
              fullWidth
              size="small"
              label="원가"
              type="number"
              value={detail.cost_price}
              onChange={(e) => handleUpdate({ cost_price: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, step: 1000 }}
              sx={{ backgroundColor: 'yellow.50' }}
            />
          </Grid>
        )}

        {/* 서비스 여부 */}
        <Grid item xs={12} md={1}>
          <FormControlLabel
            control={
              <Switch
                checked={detail.is_service}
                onChange={(e) => handleUpdate({ is_service: e.target.checked })}
                size="small"
              />
            }
            label="서비스"
            sx={{ ml: 0 }}
          />
        </Grid>

        {/* 총액 표시 */}
        <Grid item xs={6} md={1.5}>
          <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 'bold' }}>
            ₩{calculateDetailTotal().toLocaleString()}
          </Typography>
        </Grid>

        {/* 액션 버튼 */}
        <Grid item xs={6} md={0.5}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              onClick={handleCopy}
              size="small"
              sx={{ mr: 0.5 }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => onRemove(detailIndex)}
              color="error"
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>

        {/* 공급처 선택 (전체 너비) */}
        {showCostPrice && (
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>공급처</InputLabel>
              <Select
                value={detail.supplier_id || ''}
                onChange={(e) => handleSupplierChange(e.target.value)}
                label="공급처"
              >
                <MenuItem value="">
                  <em>선택 안함</em>
                </MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {/* 수익률 표시 (내부 원가 표시 시에만) */}
      {showCostPrice && (
        <Box sx={{ mt: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            원가: ₩{(detail.cost_price * detail.quantity).toLocaleString()} | 
            수익: ₩{(calculateDetailTotal() - (detail.cost_price * detail.quantity)).toLocaleString()} | 
            수익률: {calculateDetailTotal() > 0 ? 
              (((calculateDetailTotal() - (detail.cost_price * detail.quantity)) / calculateDetailTotal()) * 100).toFixed(1) 
              : 0}%
          </Typography>
        </Box>
      )}
    </Box>
  )
}