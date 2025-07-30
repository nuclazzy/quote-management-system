'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Category as CategoryIcon,
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { ItemService, type ItemCategory, type CreateCategoryData, type UpdateCategoryData } from '@/lib/services/item-service'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useNotification } from '@/contexts/NotificationContext'

interface CategoryManagementProps {
  categories: ItemCategory[]
  onRefresh: () => Promise<void>
}

interface CategoryFormData {
  name: string
  description?: string
}

export function CategoryManagement({ categories, onRefresh }: CategoryManagementProps) {
  const { handleError } = useErrorHandler()
  const { showNotification } = useNotification()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<ItemCategory | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  })

  // 카테고리 생성 모드
  const handleCreateCategory = () => {
    setEditingCategory(null)
    reset({
      name: '',
      description: '',
    })
    setDialogOpen(true)
  }

  // 카테고리 수정 모드
  const handleEditCategory = (category: ItemCategory) => {
    setEditingCategory(category)
    reset({
      name: category.name,
      description: category.description || '',
    })
    setDialogOpen(true)
  }

  // 카테고리 삭제 모드
  const handleDeleteCategory = (category: ItemCategory) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  // 폼 제출
  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true)
      
      if (editingCategory) {
        // 수정
        await ItemService.updateCategory(editingCategory.id, {
          name: data.name,
          description: data.description,
        })
        showNotification('카테고리가 수정되었습니다.', 'success')
      } else {
        // 생성
        await ItemService.createCategory({
          name: data.name,
          description: data.description,
        })
        showNotification('카테고리가 생성되었습니다.', 'success')
      }
      
      setDialogOpen(false)
      await onRefresh()
    } catch (err) {
      const errorMessage = handleError(err)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 삭제 확인
  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      setLoading(true)
      await ItemService.deleteCategory(categoryToDelete.id)
      showNotification('카테고리가 삭제되었습니다.', 'success')
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
      await onRefresh()
    } catch (err) {
      const errorMessage = handleError(err)
      showNotification(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            카테고리 관리
          </Typography>
          <Typography variant="body2" color="text.secondary">
            품목 카테고리를 생성, 수정, 삭제할 수 있습니다
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateCategory}
        >
          카테고리 추가
        </Button>
      </Box>

      {/* 카테고리 없음 상태 */}
      {categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            등록된 카테고리가 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            첫 번째 카테고리를 추가해보세요
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateCategory}
          >
            카테고리 추가
          </Button>
        </Box>
      ) : (
        /* 카테고리 테이블 */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>카테고리명</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>생성일</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {category.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {category.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category.is_active ? '활성' : '비활성'}
                      color={category.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(category.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditCategory(category)}
                      disabled={loading}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={loading}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 카테고리 생성/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingCategory ? '카테고리 수정' : '카테고리 추가'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Controller
                name="name"
                control={control}
                rules={{ 
                  required: '카테고리명은 필수입니다.',
                  maxLength: { value: 100, message: '카테고리명은 100자 이내로 입력해주세요.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="카테고리명"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    margin="normal"
                    autoFocus
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                rules={{ 
                  maxLength: { value: 500, message: '설명은 500자 이내로 입력해주세요.' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="설명 (선택사항)"
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    margin="normal"
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading}
            >
              {editingCategory ? '수정' : '생성'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>카테고리 삭제</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Alert>
          <Typography>
            '<strong>{categoryToDelete?.name}</strong>' 카테고리를 정말 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            해당 카테고리에 품목이 등록되어 있으면 삭제할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}