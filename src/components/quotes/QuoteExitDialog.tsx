'use client'

import React, { memo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Cancel as CancelIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material'

interface QuoteExitDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isEdit?: boolean
}

const QuoteExitDialog = memo(function QuoteExitDialog({
  open,
  onClose,
  onConfirm,
  isEdit = false,
}: QuoteExitDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          mx: { xs: 0, sm: 2 },
          my: { xs: 0, sm: 2 },
        },
      }}
      aria-labelledby="exit-dialog-title"
      aria-describedby="exit-dialog-description"
    >
      <DialogTitle 
        id="exit-dialog-title"
        sx={{ 
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <WarningIcon 
          color="warning" 
          sx={{ fontSize: 28 }}
          aria-hidden="true"
        />
        <Typography 
          variant="h6" 
          component="span"
          sx={{ fontWeight: 600 }}
        >
          변경사항이 있습니다
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Box id="exit-dialog-description">
          <Typography 
            variant="body1" 
            color="text.primary"
            sx={{ mb: 2, lineHeight: 1.6 }}
          >
            저장하지 않은 변경사항이 있습니다.
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ lineHeight: 1.5 }}
          >
            {isEdit 
              ? '수정된 내용이 손실됩니다. 정말 나가시겠습니까?'
              : '작성된 내용이 손실됩니다. 정말 나가시겠습니까?'
            }
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions 
        sx={{ 
          p: 3, 
          pt: 0,
          gap: 2,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Button 
          onClick={onClose}
          variant="outlined"
          startIcon={<CancelIcon />}
          fullWidth={isMobile}
          sx={{
            minHeight: 44,
            px: 3,
            fontWeight: 500,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'primary.50',
            },
          }}
          aria-label="계속 작성하기"
        >
          계속 작성
        </Button>
        
        <Button 
          onClick={onConfirm} 
          color="error"
          variant="contained"
          startIcon={<ExitIcon />}
          fullWidth={isMobile}
          sx={{
            minHeight: 44,
            px: 3,
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'error.dark',
            },
          }}
          aria-label="변경사항 무시하고 나가기"
        >
          나가기
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default QuoteExitDialog