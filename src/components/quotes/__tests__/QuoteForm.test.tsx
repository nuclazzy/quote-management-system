import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import { QuoteForm } from '@/components/quotes/QuoteForm'
import { QuoteService } from '@/lib/services/quote-service'
import { CustomerService } from '@/lib/services/customer-service'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation')
jest.mock('@/lib/services/quote-service')
jest.mock('@/lib/services/customer-service')

describe('QuoteForm', () => {
  const mockPush = jest.fn()
  const mockOnSubmit = jest.fn()
  const mockCustomers = [
    { id: '1', name: '테스트 고객사 A', contact_email: 'a@test.com' },
    { id: '2', name: '테스트 고객사 B', contact_email: 'b@test.com' },
  ]

  const defaultProps = {
    onSubmit: mockOnSubmit,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    })
    ;(CustomerService.getCustomers as jest.Mock).mockResolvedValue({
      data: mockCustomers,
    })
  })

  it('should render form fields', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 필수 필드 확인
    expect(screen.getByLabelText(/프로젝트명/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/고객사/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/유효 기간/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/담당자/i)).toBeInTheDocument()
  })

  it('should load customers on mount', async () => {
    render(<QuoteForm {...defaultProps} />)

    await waitFor(() => {
      expect(CustomerService.getCustomers).toHaveBeenCalled()
    })

    // 고객사 선택 필드 클릭
    const customerSelect = screen.getByLabelText(/고객사/i)
    fireEvent.mouseDown(customerSelect)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
      expect(screen.getByText('테스트 고객사 B')).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 빈 폼 제출 시도
    const submitButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/프로젝트명을 입력해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/고객사를 선택해주세요/i)).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should submit form with valid data', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 폼 필드 입력
    fireEvent.change(screen.getByLabelText(/프로젝트명/i), {
      target: { value: '테스트 프로젝트' },
    })

    // 고객사 선택
    const customerSelect = screen.getByLabelText(/고객사/i)
    fireEvent.mouseDown(customerSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('테스트 고객사 A'))
    })

    fireEvent.change(screen.getByLabelText(/담당자/i), {
      target: { value: '김담당' },
    })

    fireEvent.change(screen.getByLabelText(/유효 기간/i), {
      target: { value: '30' },
    })

    // 폼 제출
    const submitButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          project_title: '테스트 프로젝트',
          customer_id: '1',
          contact_person: '김담당',
          valid_days: 30,
        })
      )
    })
  })

  it('should handle form with initial data', () => {
    const initialData = {
      id: '123',
      project_title: '기존 프로젝트',
      customer_id: '1',
      contact_person: '박담당',
      valid_days: 60,
      status: 'draft' as const,
    }

    render(<QuoteForm {...defaultProps} initialData={initialData} />)

    expect(screen.getByDisplayValue('기존 프로젝트')).toBeInTheDocument()
    expect(screen.getByDisplayValue('박담당')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
  })

  it('should add and remove quote groups', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 초기 그룹 확인
    expect(screen.getByText(/그룹 1/i)).toBeInTheDocument()

    // 그룹 추가
    const addGroupButton = screen.getByRole('button', { name: /그룹 추가/i })
    fireEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByText(/그룹 2/i)).toBeInTheDocument()
    })

    // 그룹 삭제
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText(/그룹 1/i)).not.toBeInTheDocument()
    })
  })

  it('should add and remove quote items within groups', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 첫 번째 그룹에 항목 추가
    const addItemButton = screen.getByRole('button', { name: /항목 추가/i })
    fireEvent.click(addItemButton)

    await waitFor(() => {
      const itemNameInputs = screen.getAllByLabelText(/항목명/i)
      expect(itemNameInputs).toHaveLength(2) // 기본 1개 + 추가 1개
    })

    // 항목 입력
    const itemNameInputs = screen.getAllByLabelText(/항목명/i)
    fireEvent.change(itemNameInputs[1], {
      target: { value: '추가 항목' },
    })

    const quantityInputs = screen.getAllByLabelText(/수량/i)
    fireEvent.change(quantityInputs[1], {
      target: { value: '5' },
    })

    const priceInputs = screen.getAllByLabelText(/단가/i)
    fireEvent.change(priceInputs[1], {
      target: { value: '100000' },
    })

    // 자동 계산 확인
    await waitFor(() => {
      expect(screen.getByText(/500,000/)).toBeInTheDocument()
    })
  })

  it('should calculate totals correctly', async () => {
    render(<QuoteForm {...defaultProps} />)

    // 첫 번째 항목 입력
    const itemNameInputs = screen.getAllByLabelText(/항목명/i)
    fireEvent.change(itemNameInputs[0], {
      target: { value: '항목 1' },
    })

    const quantityInputs = screen.getAllByLabelText(/수량/i)
    fireEvent.change(quantityInputs[0], {
      target: { value: '2' },
    })

    const priceInputs = screen.getAllByLabelText(/단가/i)
    fireEvent.change(priceInputs[0], {
      target: { value: '150000' },
    })

    // 소계 확인
    await waitFor(() => {
      expect(screen.getByText(/300,000/)).toBeInTheDocument()
    })

    // VAT 토글
    const vatCheckbox = screen.getByLabelText(/VAT 포함/i)
    fireEvent.click(vatCheckbox)

    // 총계 확인 (VAT 10% 포함)
    await waitFor(() => {
      expect(screen.getByText(/330,000/)).toBeInTheDocument()
    })
  })

  it('should handle submission errors', async () => {
    const mockError = new Error('제출 실패')
    mockOnSubmit.mockRejectedValue(mockError)

    render(<QuoteForm {...defaultProps} />)

    // 필수 필드 입력
    fireEvent.change(screen.getByLabelText(/프로젝트명/i), {
      target: { value: '테스트 프로젝트' },
    })

    const customerSelect = screen.getByLabelText(/고객사/i)
    fireEvent.mouseDown(customerSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('테스트 고객사 A'))
    })

    // 제출
    const submitButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/제출 실패/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    mockOnSubmit.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<QuoteForm {...defaultProps} />)

    // 필수 필드 입력
    fireEvent.change(screen.getByLabelText(/프로젝트명/i), {
      target: { value: '테스트 프로젝트' },
    })

    const customerSelect = screen.getByLabelText(/고객사/i)
    fireEvent.mouseDown(customerSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('테스트 고객사 A'))
    })

    // 제출
    const submitButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(submitButton)

    // 로딩 상태 확인
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/저장 중/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})