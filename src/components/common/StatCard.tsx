'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, alpha } from '@mui/material'
import { styled } from '@mui/material/styles'
import { GlassCard } from './GlassCard'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error' | 'info'
  trend?: {
    value: number
    label: string
  }
  delay?: number
}

const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  info: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
}

const StyledIconWrapper = styled(Box)<{ color: keyof typeof gradients }>(({ theme, color }) => ({
  width: 56,
  height: 56,
  borderRadius: 16,
  background: gradients[color],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 30% 30%, ${alpha(theme.palette.common.white, 0.3)}, transparent 70%)`,
  },
  
  '& > *': {
    position: 'relative',
    zIndex: 1,
    color: 'white',
    fontSize: '1.5rem',
  }
}))

const AnimatedNumber = ({ value, delay = 0 }: { value: string | number, delay?: number }) => {
  const [displayValue, setDisplayValue] = useState(0)
  const numericValue = typeof value === 'string' ? 
    parseInt(value.replace(/[^0-9]/g, '')) || 0 : 
    value

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0
      const increment = numericValue / 30
      const animation = setInterval(() => {
        current += increment
        if (current >= numericValue) {
          setDisplayValue(numericValue)
          clearInterval(animation)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, 16)
      
      return () => clearInterval(animation)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [numericValue, delay])

  if (typeof value === 'string' && value.includes('₩')) {
    return <span>₩{displayValue.toLocaleString()}</span>
  }
  
  if (typeof value === 'string' && value.includes('개')) {
    return <span>{displayValue.toLocaleString()}개</span>
  }
  
  return <span>{displayValue.toLocaleString()}</span>
}

export function StatCard({ title, value, icon, color, trend, delay = 0 }: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <GlassCard
      variant="default"
      sx={{
        p: 3,
        height: '100%',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDelay: `${delay}ms`,
        '&:hover': {
          '& .stat-icon': {
            transform: 'scale(1.1) rotate(5deg)',
          },
          '& .stat-value': {
            transform: 'scale(1.05)',
          }
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontWeight: 500,
              mb: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.75rem'
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="h4" 
            className="stat-value"
            sx={{ 
              fontWeight: 700,
              background: gradients[color],
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'transform 0.3s ease',
              lineHeight: 1.2,
            }}
          >
            <AnimatedNumber value={value} delay={delay + 200} />
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: trend.value > 0 ? 'success.main' : 'error.main',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                {trend.value > 0 ? '↗' : '↘'} {Math.abs(trend.value)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {trend.label}
              </Typography>
            </Box>
          )}
        </Box>
        <StyledIconWrapper 
          color={color} 
          className="stat-icon"
          sx={{ 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {icon}
        </StyledIconWrapper>
      </Box>
    </GlassCard>
  )
}