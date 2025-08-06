import React from 'react'
import { render, screen } from '@/utils/test-utils'
import { LoadingState } from '../LoadingState'

describe('LoadingState', () => {
  it('should render loading spinner', () => {
    const { container } = render(<LoadingState />)
    
    // CircularProgress 컴포넌트가 렌더링되는지 확인
    const progressBar = container.querySelector('.MuiCircularProgress-root')
    expect(progressBar).toBeInTheDocument()
  })

  it('should render with custom message', () => {
    render(<LoadingState message="데이터를 불러오는 중..." />)
    
    expect(screen.getByText('데이터를 불러오는 중...')).toBeInTheDocument()
  })

  it('should render default message when no message provided', () => {
    render(<LoadingState />)
    
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('should center the content', () => {
    const { container } = render(<LoadingState />)
    
    const box = container.firstChild
    expect(box).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    })
  })

  it('should have proper minimum height', () => {
    const { container } = render(<LoadingState />)
    
    const box = container.firstChild
    expect(box).toHaveStyle({
      minHeight: '400px',
    })
  })
})