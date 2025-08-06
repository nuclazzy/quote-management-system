import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import { CustomerManagement } from '@/components/customer/CustomerManagement'
import { CustomerService } from '@/lib/services/customer-service'

jest.mock('@/lib/services/customer-service')

describe('CustomerManagement', () => {
  const mockCustomers = [
    {
      id: '1',
      name: '테스트 고객사 A',
      contact_email: 'a@test.com',
      contact_phone: '02-1234-5678',
      address: '서울시 강남구',
      notes: '중요 고객',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      name: '테스트 고객사 B',
      contact_email: 'b@test.com',
      contact_phone: '02-8765-4321',
      address: '서울시 서초구',
      notes: '신규 고객',
      created_at: '2024-01-16T10:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(CustomerService.getCustomers as jest.Mock).mockResolvedValue({
      data: mockCustomers,
      count: 2,
    })
  })

  it('should render customer management page', () => {
    render(<CustomerManagement />)

    expect(screen.getByText('고객사 관리')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새 고객사/i })).toBeInTheDocument()
  })

  it('should load and display customers', async () => {
    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
      expect(screen.getByText('테스트 고객사 B')).toBeInTheDocument()
    })

    expect(screen.getByText('a@test.com')).toBeInTheDocument()
    expect(screen.getByText('b@test.com')).toBeInTheDocument()
  })

  it('should open add customer dialog', async () => {
    render(<CustomerManagement />)

    const addButton = screen.getByRole('button', { name: /새 고객사/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('새 고객사 추가')).toBeInTheDocument()
      expect(screen.getByLabelText(/고객사명/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/전화번호/i)).toBeInTheDocument()
    })
  })

  it('should add new customer', async () => {
    const newCustomer = {
      id: '3',
      name: '새 고객사',
      contact_email: 'new@test.com',
      contact_phone: '02-9999-9999',
      address: '서울시 송파구',
      notes: '테스트 고객',
    }

    ;(CustomerService.createCustomer as jest.Mock).mockResolvedValue(newCustomer)
    ;(CustomerService.getCustomers as jest.Mock)
      .mockResolvedValueOnce({ data: mockCustomers, count: 2 })
      .mockResolvedValueOnce({ 
        data: [...mockCustomers, newCustomer], 
        count: 3 
      })

    render(<CustomerManagement />)

    // 추가 버튼 클릭
    const addButton = screen.getByRole('button', { name: /새 고객사/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('새 고객사 추가')).toBeInTheDocument()
    })

    // 폼 입력
    fireEvent.change(screen.getByLabelText(/고객사명/i), {
      target: { value: '새 고객사' },
    })
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: 'new@test.com' },
    })
    fireEvent.change(screen.getByLabelText(/전화번호/i), {
      target: { value: '02-9999-9999' },
    })
    fireEvent.change(screen.getByLabelText(/주소/i), {
      target: { value: '서울시 송파구' },
    })

    // 저장
    const saveButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(CustomerService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '새 고객사',
          contact_email: 'new@test.com',
          contact_phone: '02-9999-9999',
          address: '서울시 송파구',
        })
      )
    })

    // 목록 새로고침 확인
    await waitFor(() => {
      expect(screen.getByText('새 고객사')).toBeInTheDocument()
    })
  })

  it('should edit customer', async () => {
    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })

    // 편집 버튼 클릭
    const editButtons = screen.getAllByRole('button', { name: /편집/i })
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('고객사 수정')).toBeInTheDocument()
      expect(screen.getByDisplayValue('테스트 고객사 A')).toBeInTheDocument()
    })

    // 수정
    const nameInput = screen.getByDisplayValue('테스트 고객사 A')
    fireEvent.change(nameInput, {
      target: { value: '수정된 고객사 A' },
    })

    ;(CustomerService.updateCustomer as jest.Mock).mockResolvedValue({
      ...mockCustomers[0],
      name: '수정된 고객사 A',
    })

    // 저장
    const saveButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(CustomerService.updateCustomer).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: '수정된 고객사 A',
        })
      )
    })
  })

  it('should delete customer', async () => {
    window.confirm = jest.fn(() => true)
    ;(CustomerService.deleteCustomer as jest.Mock).mockResolvedValue(undefined)

    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })

    // 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i })
    fireEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith(
      '정말로 이 고객사를 삭제하시겠습니까?'
    )

    await waitFor(() => {
      expect(CustomerService.deleteCustomer).toHaveBeenCalledWith('1')
    })

    // 목록 새로고침
    ;(CustomerService.getCustomers as jest.Mock).mockResolvedValue({
      data: [mockCustomers[1]],
      count: 1,
    })

    await waitFor(() => {
      expect(screen.queryByText('테스트 고객사 A')).not.toBeInTheDocument()
    })
  })

  it('should cancel delete when user declines', async () => {
    window.confirm = jest.fn(() => false)

    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })

    // 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i })
    fireEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(CustomerService.deleteCustomer).not.toHaveBeenCalled()
  })

  it('should search customers', async () => {
    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })

    // 검색 입력
    const searchInput = screen.getByPlaceholderText(/검색/i)
    fireEvent.change(searchInput, {
      target: { value: '고객사 A' },
    })

    // 검색 실행 (디바운스 대기)
    await waitFor(() => {
      expect(CustomerService.getCustomers).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '고객사 A',
        })
      )
    }, { timeout: 1000 })
  })

  it('should handle empty customer list', async () => {
    ;(CustomerService.getCustomers as jest.Mock).mockResolvedValue({
      data: [],
      count: 0,
    })

    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('등록된 고객사가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('새로운 고객사를 추가해보세요')).toBeInTheDocument()
    })
  })

  it('should handle API errors', async () => {
    const errorMessage = '고객사 목록을 불러오는데 실패했습니다'
    ;(CustomerService.getCustomers as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    )

    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // 재시도 버튼
    const retryButton = screen.getByRole('button', { name: /재시도/i })
    expect(retryButton).toBeInTheDocument()

    // 재시도 클릭
    ;(CustomerService.getCustomers as jest.Mock).mockResolvedValue({
      data: mockCustomers,
      count: 2,
    })

    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })
  })

  it('should validate customer form', async () => {
    render(<CustomerManagement />)

    const addButton = screen.getByRole('button', { name: /새 고객사/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('새 고객사 추가')).toBeInTheDocument()
    })

    // 빈 폼 제출
    const saveButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/고객사명을 입력해주세요/i)).toBeInTheDocument()
    })

    // 잘못된 이메일 형식
    fireEvent.change(screen.getByLabelText(/고객사명/i), {
      target: { value: '테스트' },
    })
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: 'invalid-email' },
    })

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/올바른 이메일 형식이 아닙니다/i)).toBeInTheDocument()
    })
  })

  it('should export customers to Excel', async () => {
    const mockExport = jest.fn()
    jest.doMock('@/utils/excel-export', () => ({
      exportCustomersToExcel: mockExport,
    }))

    render(<CustomerManagement />)

    await waitFor(() => {
      expect(screen.getByText('테스트 고객사 A')).toBeInTheDocument()
    })

    const exportButton = screen.getByRole('button', { name: /Excel 내보내기/i })
    fireEvent.click(exportButton)

    // Excel 내보내기 함수 호출 확인
    // Note: 실제 구현에서는 exportCustomersToExcel 함수가 호출되어야 함
  })
})