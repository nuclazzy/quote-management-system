import { Components, Theme } from '@mui/material/styles'
import { brandColors, statusColors } from './colors'
import { spacing } from './spacing'

export const components: Components<Theme> = {
  // 버튼 컴포넌트
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
      sizeSmall: {
        padding: `${spacing[2]} ${spacing[4]}`,
        fontSize: '0.75rem',
      },
      sizeMedium: {
        padding: `${spacing[3]} ${spacing[6]}`,
        fontSize: '0.875rem',
      },
      sizeLarge: {
        padding: `${spacing[4]} ${spacing[8]}`,
        fontSize: '1rem',
      },
    },
  },

  // 카드 컴포넌트
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        '&:hover': {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },

  // 페이퍼 컴포넌트
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
      elevation1: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      },
      elevation2: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      elevation3: {
        boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      },
    },
  },

  // 텍스트 필드
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: brandColors.primary[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
            borderColor: brandColors.primary[500],
          },
        },
      },
    },
  },

  // 셀렉트
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
    },
  },

  // 칩
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '6px',
        fontWeight: 500,
      },
      colorPrimary: {
        backgroundColor: brandColors.primary[100],
        color: brandColors.primary[800],
      },
      colorSecondary: {
        backgroundColor: brandColors.secondary[100],
        color: brandColors.secondary[800],
      },
      colorSuccess: {
        backgroundColor: brandColors.success[100],
        color: brandColors.success[800],
      },
      colorWarning: {
        backgroundColor: brandColors.warning[100],
        color: brandColors.warning[800],
      },
      colorError: {
        backgroundColor: brandColors.error[100],
        color: brandColors.error[800],
      },
    },
  },

  // 테이블
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        border: `1px solid ${brandColors.neutral[200]}`,
      },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: brandColors.neutral[50],
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${brandColors.neutral[200]}`,
      },
      head: {
        fontWeight: 600,
        color: brandColors.neutral[700],
        backgroundColor: brandColors.neutral[50],
      },
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: brandColors.neutral[50],
        },
        '&.Mui-selected': {
          backgroundColor: brandColors.primary[50],
          '&:hover': {
            backgroundColor: brandColors.primary[100],
          },
        },
      },
    },
  },

  // 다이얼로그
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '12px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
      },
    },
  },

  // 앱바
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        color: brandColors.neutral[800],
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    },
  },

  // 드로어
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: `1px solid ${brandColors.neutral[200]}`,
        backgroundColor: '#ffffff',
      },
    },
  },

  // 리스트 아이템
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        margin: `${spacing[1]} ${spacing[2]}`,
        '&.Mui-selected': {
          backgroundColor: brandColors.primary[50],
          color: brandColors.primary[700],
          '&:hover': {
            backgroundColor: brandColors.primary[100],
          },
          '& .MuiListItemIcon-root': {
            color: brandColors.primary[700],
          },
        },
        '&:hover': {
          backgroundColor: brandColors.neutral[50],
        },
      },
    },
  },

  // 아이콘 버튼
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      },
    },
  },

  // 패브
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        '&:hover': {
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },

  // 알림
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
      standardSuccess: {
        backgroundColor: brandColors.success[50],
        color: brandColors.success[800],
      },
      standardError: {
        backgroundColor: brandColors.error[50],
        color: brandColors.error[800],
      },
      standardWarning: {
        backgroundColor: brandColors.warning[50],
        color: brandColors.warning[800],
      },
      standardInfo: {
        backgroundColor: brandColors.primary[50],
        color: brandColors.primary[800],
      },
    },
  },
}