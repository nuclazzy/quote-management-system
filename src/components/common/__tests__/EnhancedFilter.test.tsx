import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import userEvent from '@testing-library/user-event'
import EnhancedFilter, { FilterField } from '../EnhancedFilter'

describe('EnhancedFilter', () => {
  const mockFields: FilterField[] = [
    {
      id: 'status',
      label: '상태',
      type: 'multiselect',
      options: [
        { label: '활성', value: 'active' },
        { label: '비활성', value: 'inactive' },
      ],
    },
    {
      id: 'name',
      label: '이름',
      type: 'text',
      placeholder: '이름을 입력하세요',
    },
    {
      id: 'created_at',
      label: '생성일',
      type: 'date',
    },
    {
      id: 'amount',
      label: '금액',
      type: 'number',
      min: 0,
      max: 1000000,
      step: 1000,
    },
  ]

  const mockOnFilterChange = jest.fn()
  const mockOnSearch = jest.fn()
  const mockOnExport = jest.fn()
  const mockOnSavePreset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render filter header with title', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
      />
    )

    expect(screen.getByText('필터')).toBeInTheDocument()
  })

  it('should render search input with custom placeholder', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        searchPlaceholder="사용자 검색..."
      />
    )

    expect(screen.getByPlaceholderText('사용자 검색...')).toBeInTheDocument()
  })

  it('should expand and collapse filter section', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
      />
    )

    // 초기에는 축소된 상태
    expect(screen.queryByLabelText('이름')).not.toBeInTheDocument()

    // 확장 버튼 클릭
    const expandButton = screen.getByRole('button', { name: '' })
    fireEvent.click(expandButton)

    // 필터 필드가 보여야 함
    waitFor(() => {
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
    })
  })

  it('should call onFilterChange when search input changes', async () => {
    const user = userEvent.setup()
    
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
      />
    )

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요...')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith({ search: 'test' })
    })
  })

  it('should call onSearch when search button is clicked', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
      />
    )

    const searchButton = screen.getByRole('button', { name: /검색/i })
    fireEvent.click(searchButton)

    expect(mockOnSearch).toHaveBeenCalled()
  })

  it('should show active filter chips', async () => {
    const user = userEvent.setup()
    
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        initialFilter={{ search: 'test' }}
      />
    )

    // 검색어 필터 칩이 표시되어야 함
    await waitFor(() => {
      expect(screen.getByText('검색어')).toBeInTheDocument()
    })
  })

  it('should clear all filters when clear button is clicked', async () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        initialFilter={{ search: 'test', status: ['active'] }}
      />
    )

    // 초기화 버튼이 보여야 함
    const clearButton = await screen.findByRole('button', { name: /전체 초기화/i })
    fireEvent.click(clearButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith({})
  })

  it('should show export menu when enabled', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        onExport={mockOnExport}
        enableExport={true}
      />
    )

    expect(screen.getByRole('button', { name: /내보내기/i })).toBeInTheDocument()
  })

  it('should not show export menu when disabled', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        enableExport={false}
      />
    )

    expect(screen.queryByRole('button', { name: /내보내기/i })).not.toBeInTheDocument()
  })

  it('should show preset menu when enabled with save function', () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        onSavePreset={mockOnSavePreset}
        enablePresets={true}
      />
    )

    expect(screen.getByRole('button', { name: /프리셋/i })).toBeInTheDocument()
  })

  it('should handle export menu click', async () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
        onExport={mockOnExport}
        enableExport={true}
      />
    )

    // 내보내기 버튼 클릭
    const exportButton = screen.getByRole('button', { name: /내보내기/i })
    fireEvent.click(exportButton)

    // 메뉴 옵션이 나타나야 함
    await waitFor(() => {
      expect(screen.getByText('CSV로 내보내기')).toBeInTheDocument()
      expect(screen.getByText('Excel로 내보내기')).toBeInTheDocument()
    })

    // CSV 내보내기 클릭
    fireEvent.click(screen.getByText('CSV로 내보내기'))

    expect(mockOnExport).toHaveBeenCalledWith({}, 'csv')
  })

  it('should render different field types correctly', async () => {
    render(
      <EnhancedFilter
        fields={mockFields}
        onFilterChange={mockOnFilterChange}
        onSearch={mockOnSearch}
      />
    )

    // 필터 섹션 확장
    const expandButton = screen.getByRole('button', { name: '' })
    fireEvent.click(expandButton)

    await waitFor(() => {
      // Text field
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
      
      // Number field
      expect(screen.getByLabelText('금액')).toBeInTheDocument()
      
      // Multiselect field
      expect(screen.getByLabelText('상태')).toBeInTheDocument()
    })
  })
})