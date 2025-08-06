import React from 'react'
import { render, screen } from '@/utils/test-utils'
import { QuoteStatusChip } from '../QuoteStatusChip'

describe('QuoteStatusChip', () => {
  it('should render draft status correctly', () => {
    render(<QuoteStatusChip status="draft" />)
    
    const chip = screen.getByText('임시저장')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorDefault')
  })

  it('should render sent status correctly', () => {
    render(<QuoteStatusChip status="sent" />)
    
    const chip = screen.getByText('발송됨')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorPrimary')
  })

  it('should render accepted status correctly', () => {
    render(<QuoteStatusChip status="accepted" />)
    
    const chip = screen.getByText('수주확정')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorSuccess')
  })

  it('should render rejected status correctly', () => {
    render(<QuoteStatusChip status="rejected" />)
    
    const chip = screen.getByText('거절됨')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorError')
  })

  it('should render expired status correctly', () => {
    render(<QuoteStatusChip status="expired" />)
    
    const chip = screen.getByText('만료됨')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorWarning')
  })

  it('should render revised status correctly', () => {
    render(<QuoteStatusChip status="revised" />)
    
    const chip = screen.getByText('수정요청')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorInfo')
  })

  it('should render canceled status correctly', () => {
    render(<QuoteStatusChip status="canceled" />)
    
    const chip = screen.getByText('취소됨')
    expect(chip).toBeInTheDocument()
    expect(chip.parentElement).toHaveClass('MuiChip-colorDefault')
  })

  it('should apply small size when specified', () => {
    render(<QuoteStatusChip status="draft" size="small" />)
    
    const chip = screen.getByText('임시저장')
    expect(chip.parentElement).toHaveClass('MuiChip-sizeSmall')
  })

  it('should apply medium size by default', () => {
    render(<QuoteStatusChip status="draft" />)
    
    const chip = screen.getByText('임시저장')
    expect(chip.parentElement).toHaveClass('MuiChip-sizeMedium')
  })
})