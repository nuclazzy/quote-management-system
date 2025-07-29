'use client'

import React, { memo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material'
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'
import QuoteGroupForm from './QuoteGroupForm'

interface QuoteGroup {
  id?: string
  name: string
  items: Array<{
    id?: string
    name: string
    quantity: number
    unit_cost: number
    selling_price: number
    notes?: string
  }>
}

interface QuoteItemsManagerProps {
  groups: QuoteGroup[]
  showCostPrice: boolean
  onAddGroup: () => void
  onUpdateGroup: (groupIndex: number, updates: Partial<QuoteGroup>) => void
  onRemoveGroup: (groupIndex: number) => void
}

const EmptyState = memo(function EmptyState({ onAddGroup }: { onAddGroup: () => void }) {
  return (
    <Card 
      sx={{ 
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'primary.50',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <AssignmentIcon 
            sx={{ 
              fontSize: 64, 
              color: 'grey.400',
              mb: 1,
            }} 
          />
          <Box>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              견적 항목이 없습니다
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 300 }}
            >
              견적서에 포함할 그룹과 항목들을 추가해보세요.
              각 그룹별로 관련 항목들을 체계적으로 관리할 수 있습니다.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddGroup}
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            aria-label="첫 번째 견적 그룹 추가"
          >
            그룹 추가하기
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
})

const QuoteItemsManager = memo(function QuoteItemsManager({
  groups,
  showCostPrice,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
}: QuoteItemsManagerProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography 
            variant="h6"
            component="h2"
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            견적 내용
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            그룹별로 견적 항목을 관리하고 계산하세요
          </Typography>
        </Box>
        
        {groups.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddGroup}
            sx={{
              px: 3,
              py: 1,
              fontWeight: 500,
              borderRadius: 2,
              minHeight: 44, // 터치 타겟 크기 개선
              '&:hover': {
                backgroundColor: 'primary.50',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            aria-label="새로운 견적 그룹 추가"
          >
            그룹 추가
          </Button>
        )}
      </Box>

      {groups.length === 0 ? (
        <EmptyState onAddGroup={onAddGroup} />
      ) : (
        <Stack spacing={3}>
          {groups.map((group, groupIndex) => (
            <QuoteGroupForm
              key={`group-${groupIndex}`}
              group={group}
              groupIndex={groupIndex}
              showCostPrice={showCostPrice}
              onUpdate={onUpdateGroup}
              onRemove={onRemoveGroup}
            />
          ))}
        </Stack>
      )}
    </Paper>
  )
})

export default QuoteItemsManager