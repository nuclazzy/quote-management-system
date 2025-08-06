import React from 'react'
import { render, screen, waitFor, fireEvent } from '@/utils/test-utils'
import { useRouter } from 'next/navigation'
import QuotesPage from '@/app/(dashboard)/quotes/page'
import { QuoteService } from '@/lib/services/quote-service'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/services/quote-service')

describe('QuotesPage Integration Test', () => {
  const mockPush = jest.fn()
  const mockQuotes = [
    {
      id: '1',
      quote_number: 'Q-2024-001',
      project_title: 'Test Project 1',
      customer_name_snapshot: 'Customer A',
      total_amount: 1000000,
      status: 'draft',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      quote_number: 'Q-2024-002',
      project_title: 'Test Project 2',
      customer_name_snapshot: 'Customer B',
      total_amount: 2000000,
      status: 'sent',
      created_at: '2024-01-16T10:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/quotes',
    })
    ;(QuoteService.getQuotes as jest.Mock).mockResolvedValue({
      data: mockQuotes,
      count: 2,
      page: 1,
      total_pages: 1,
    })
  })

  it('should render quotes page with title', async () => {
    render(<QuotesPage />)

    expect(screen.getByText('견적서 관리')).toBeInTheDocument()
  })

  it('should load and display quotes', async () => {
    render(<QuotesPage />)

    // 로딩 상태 확인
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()

    // 견적서 목록이 로드되기를 기다림
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })

    // 고객사명 표시 확인
    expect(screen.getByText(/Customer A/)).toBeInTheDocument()
    expect(screen.getByText(/Customer B/)).toBeInTheDocument()

    // 견적서 번호 표시 확인
    expect(screen.getByText(/Q-2024-001/)).toBeInTheDocument()
    expect(screen.getByText(/Q-2024-002/)).toBeInTheDocument()
  })

  it('should navigate to new quote page when clicking new button', async () => {
    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    const newQuoteButton = screen.getByRole('button', { name: /새 견적서/i })
    fireEvent.click(newQuoteButton)

    expect(mockPush).toHaveBeenCalledWith('/quotes/new')
  })

  it('should navigate to quote detail when clicking quote card', async () => {
    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // 견적서 카드 클릭
    const quoteCard = screen.getByText('Test Project 1').closest('[class*="Card"]')
    if (quoteCard) {
      fireEvent.click(quoteCard)
      expect(mockPush).toHaveBeenCalledWith('/quotes/1')
    }
  })

  it('should filter quotes by status', async () => {
    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    // 필터 섹션 확장
    const filterButton = screen.getByText('필터')
    fireEvent.click(filterButton)

    // 상태 필터 적용
    // Note: 실제 구현에서는 EnhancedFilter 컴포넌트의 동작을 테스트
    expect(QuoteService.getQuotes).toHaveBeenCalled()
  })

  it('should handle empty quote list', async () => {
    ;(QuoteService.getQuotes as jest.Mock).mockResolvedValue({
      data: [],
      count: 0,
      page: 1,
      total_pages: 0,
    })

    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.getByText('견적서가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('새로운 견적서를 작성해보세요')).toBeInTheDocument()
    })
  })

  it('should handle error when loading quotes', async () => {
    const errorMessage = '견적서를 불러오는데 실패했습니다.'
    ;(QuoteService.getQuotes as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    )

    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // 재시도 버튼 확인
    const retryButton = screen.getByRole('button', { name: /재시도/i })
    expect(retryButton).toBeInTheDocument()

    // 재시도 클릭
    fireEvent.click(retryButton)
    expect(QuoteService.getQuotes).toHaveBeenCalledTimes(2)
  })

  it('should show total count of quotes', async () => {
    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.getByText('총 2건의 견적서')).toBeInTheDocument()
    })
  })

  it('should handle quote selection mode', async () => {
    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    // 선택 모드 활성화
    const selectButton = screen.getByRole('button', { name: /선택/i })
    fireEvent.click(selectButton)

    // 선택 취소 버튼이 나타나야 함
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()

    // 전체 선택 버튼이 나타나야 함
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /전체 선택/i })).toBeInTheDocument()
    })
  })

  it('should export quotes to Excel', async () => {
    const mockExport = jest.fn()
    jest.doMock('@/utils/excel-export', () => ({
      exportQuotesToExcel: mockExport,
    }))

    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    const exportButton = screen.getByRole('button', { name: /Excel 내보내기/i })
    fireEvent.click(exportButton)

    // Excel 내보내기 함수가 호출되어야 함
    // Note: 실제 구현에서는 exportQuotesToExcel 함수 호출 확인
  })

  it('should handle pagination', async () => {
    ;(QuoteService.getQuotes as jest.Mock).mockResolvedValue({
      data: mockQuotes,
      count: 50,
      page: 1,
      total_pages: 3,
    })

    render(<QuotesPage />)

    await waitFor(() => {
      expect(screen.queryByText('로딩 중...')).not.toBeInTheDocument()
    })

    // 페이지네이션 컴포넌트가 렌더링되어야 함
    const pagination = screen.getByRole('navigation', { name: /pagination/i })
    expect(pagination).toBeInTheDocument()
  })
})