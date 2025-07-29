'use client'

import React, { memo } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme as useMuiTheme,
} from '@mui/material'
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as AutoModeIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material'
import { useCustomTheme } from '@/contexts/ThemeContext'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeModeOption {
  mode: ThemeMode
  label: string
  icon: React.ReactNode
  description: string
}

const themeModeOptions: ThemeModeOption[] = [
  {
    mode: 'light',
    label: '라이트 모드',
    icon: <LightModeIcon />,
    description: '밝은 테마를 사용합니다',
  },
  {
    mode: 'dark',
    label: '다크 모드',
    icon: <DarkModeIcon />,
    description: '어두운 테마를 사용합니다',
  },
  {
    mode: 'system',
    label: '시스템 설정',
    icon: <AutoModeIcon />,
    description: '시스템 설정을 따릅니다',
  },
]

const ThemeToggle = memo(function ThemeToggle() {
  const { mode, setMode, effectiveMode } = useCustomTheme()
  const muiTheme = useMuiTheme()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleModeSelect = (selectedMode: ThemeMode) => {
    setMode(selectedMode)
    handleClose()
  }

  const getCurrentIcon = () => {
    if (mode === 'system') {
      return effectiveMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />
    }
    return mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />
  }

  const getCurrentTooltip = () => {
    const currentOption = themeModeOptions.find(option => option.mode === mode)
    return currentOption ? `테마: ${currentOption.label}` : '테마 변경'
  }

  return (
    <>
      <Tooltip title={getCurrentTooltip()} arrow>
        <IconButton
          onClick={handleClick}
          aria-label="테마 모드 변경"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            color: 'inherit',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.05)',
            },
          }}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>

      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-toggle-button',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            border: `1px solid ${muiTheme.palette.divider}`,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              '&:hover': {
                backgroundColor: muiTheme.palette.action.hover,
              },
              '&.Mui-selected': {
                backgroundColor: muiTheme.palette.primary.main,
                color: muiTheme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: muiTheme.palette.primary.dark,
                },
                '& .MuiListItemIcon-root': {
                  color: 'inherit',
                },
              },
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {themeModeOptions.map((option) => (
          <MenuItem
            key={option.mode}
            onClick={() => handleModeSelect(option.mode)}
            selected={mode === option.mode}
            sx={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              py: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {option.icon}
              </ListItemIcon>
              <ListItemText 
                primary={option.label}
                sx={{ 
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: mode === option.mode ? 600 : 400,
                  },
                }}
              />
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              opacity: 0.7, 
              marginLeft: 36,
              marginTop: 2,
            }}>
              {option.description}
            </div>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
})

export default ThemeToggle