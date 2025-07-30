'use client'

import { Card, CardProps, alpha } from '@mui/material'
import { styled } from '@mui/material/styles'

interface GlassCardProps extends CardProps {
  variant?: 'default' | 'elevated' | 'outlined'
  blur?: number
  opacity?: number
}

const StyledGlassCard = styled(Card, {
  shouldForwardProp: (prop) => !['blur', 'opacity'].includes(prop as string),
})<{ blur?: number; opacity?: number; variant?: string }>(({ theme, blur = 10, opacity = 0.8, variant = 'default' }) => {
  const baseStyles = {
    background: alpha(theme.palette.background.paper, opacity),
    backdropFilter: `blur(${blur}px)`,
    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    borderRadius: 16,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.4)}, transparent)`,
    },
    
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '1px',
      height: '100%',
      background: `linear-gradient(180deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
    }
  }

  const variantStyles = {
    default: {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
      }
    },
    elevated: {
      transform: 'translateY(-4px)',
      boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.1)}`,
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.15)}`,
      }
    },
    outlined: {
      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      '&:hover': {
        border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
        transform: 'scale(1.02)',
      }
    }
  }

  return {
    ...baseStyles,
    ...variantStyles[variant as keyof typeof variantStyles]
  }
})

export function GlassCard({ 
  children, 
  variant = 'default', 
  blur = 10, 
  opacity = 0.8, 
  sx,
  ...props 
}: GlassCardProps) {
  return (
    <StyledGlassCard
      variant={variant}
      blur={blur}
      opacity={opacity}
      sx={sx}
      {...props}
    >
      {children}
    </StyledGlassCard>
  )
}