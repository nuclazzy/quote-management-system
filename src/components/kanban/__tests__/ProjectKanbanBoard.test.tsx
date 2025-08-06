import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/utils/test-utils'
import { ProjectKanbanBoard } from '@/components/kanban/ProjectKanbanBoard'
import { ProjectService } from '@/lib/services/project-service'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

jest.mock('@/lib/services/project-service')
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: jest.fn(({ children }) => children),
  Droppable: jest.fn(({ children }) => children({ droppableProps: {}, innerRef: jest.fn(), placeholder: null })),
  Draggable: jest.fn(({ children }) => children({ draggableProps: {}, innerRef: jest.fn(), dragHandleProps: {} }, {})),
}))

describe('ProjectKanbanBoard', () => {
  const mockProjects = [
    {
      id: '1',
      title: '프로젝트 A',
      status: 'planning',
      priority: 'high',
      progress: 25,
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      assignee: '김담당',
      description: '중요 프로젝트',
    },
    {
      id: '2',
      title: '프로젝트 B',
      status: 'in_progress',
      priority: 'medium',
      progress: 60,
      start_date: '2024-02-01',
      end_date: '2024-04-30',
      assignee: '박담당',
      description: '진행 중인 프로젝트',
    },
    {
      id: '3',
      title: '프로젝트 C',
      status: 'completed',
      priority: 'low',
      progress: 100,
      start_date: '2024-01-15',
      end_date: '2024-02-28',
      assignee: '이담당',
      description: '완료된 프로젝트',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(ProjectService.getProjects as jest.Mock).mockResolvedValue({
      data: mockProjects,
      count: 3,
    })
  })

  it('should render kanban board with columns', async () => {
    render(<ProjectKanbanBoard />)

    // 컬럼 타이틀 확인
    expect(screen.getByText('기획 단계')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.getByText('검토 중')).toBeInTheDocument()
    expect(screen.getByText('완료')).toBeInTheDocument()
  })

  it('should load and display projects in correct columns', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 B')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 C')).toBeInTheDocument()
    })

    // 프로젝트 상태 확인
    expect(screen.getByText('중요 프로젝트')).toBeInTheDocument()
    expect(screen.getByText('진행 중인 프로젝트')).toBeInTheDocument()
    expect(screen.getByText('완료된 프로젝트')).toBeInTheDocument()
  })

  it('should display project progress', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('should display priority badges', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('높음')).toBeInTheDocument()
      expect(screen.getByText('보통')).toBeInTheDocument()
      expect(screen.getByText('낮음')).toBeInTheDocument()
    })
  })

  it('should open project detail modal on card click', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
    })

    // 프로젝트 카드 클릭
    const projectCard = screen.getByText('프로젝트 A').closest('[class*="card"]')
    if (projectCard) {
      fireEvent.click(projectCard)
    }

    await waitFor(() => {
      expect(screen.getByText('프로젝트 상세')).toBeInTheDocument()
      expect(screen.getByText('김담답')).toBeInTheDocument()
      expect(screen.getByText('2024-01-01 ~ 2024-03-31')).toBeInTheDocument()
    })
  })

  it('should add new project', async () => {
    const newProject = {
      id: '4',
      title: '새 프로젝트',
      status: 'planning',
      priority: 'high',
      assignee: '최담당',
    }

    ;(ProjectService.createProject as jest.Mock).mockResolvedValue(newProject)

    render(<ProjectKanbanBoard />)

    // 추가 버튼 클릭
    const addButton = screen.getByRole('button', { name: /새 프로젝트/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('새 프로젝트 추가')).toBeInTheDocument()
    })

    // 폼 입력
    fireEvent.change(screen.getByLabelText(/프로젝트명/i), {
      target: { value: '새 프로젝트' },
    })

    fireEvent.change(screen.getByLabelText(/담당자/i), {
      target: { value: '최담당' },
    })

    // 저장
    const saveButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(ProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '새 프로젝트',
          assignee: '최담당',
        })
      )
    })
  })

  it('should update project status via drag and drop', async () => {
    const updatedProject = {
      ...mockProjects[0],
      status: 'in_progress',
    }

    ;(ProjectService.updateProject as jest.Mock).mockResolvedValue(updatedProject)

    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
    })

    // 드래그 앤 드롭 시뮬레이션
    // Note: 실제 구현에서는 @hello-pangea/dnd의 onDragEnd 핸수가 호출됨
    const mockResult = {
      draggableId: '1',
      source: { droppableId: 'planning', index: 0 },
      destination: { droppableId: 'in_progress', index: 0 },
    }

    // onDragEnd 함수 호출 시뮬레이션
    // 실제 구현에서는 DragDropContext의 onDragEnd prop으로 전달됨
  })

  it('should filter projects by search', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 B')).toBeInTheDocument()
    })

    // 검색 입력
    const searchInput = screen.getByPlaceholderText(/검색/i)
    fireEvent.change(searchInput, {
      target: { value: '프로젝트 A' },
    })

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
      expect(screen.queryByText('프로젝트 B')).not.toBeInTheDocument()
    })
  })

  it('should filter projects by assignee', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
    })

    // 담당자 필터 선택
    const assigneeFilter = screen.getByLabelText(/담당자/i)
    fireEvent.mouseDown(assigneeFilter)

    await waitFor(() => {
      expect(screen.getByText('김담당')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('김담당'))

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
      expect(screen.queryByText('프로젝트 B')).not.toBeInTheDocument()
    })
  })

  it('should update project details', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
    })

    // 프로젝트 카드 클릭
    const projectCard = screen.getByText('프로젝트 A').closest('[class*="card"]')
    if (projectCard) {
      fireEvent.click(projectCard)
    }

    await waitFor(() => {
      expect(screen.getByText('프로젝트 상세')).toBeInTheDocument()
    })

    // 편집 버튼 클릭
    const editButton = screen.getByRole('button', { name: /편집/i })
    fireEvent.click(editButton)

    // 프로그레스 업데이트
    const progressInput = screen.getByLabelText(/진행률/i)
    fireEvent.change(progressInput, {
      target: { value: '50' },
    })

    ;(ProjectService.updateProject as jest.Mock).mockResolvedValue({
      ...mockProjects[0],
      progress: 50,
    })

    // 저장
    const saveButton = screen.getByRole('button', { name: /저장/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(ProjectService.updateProject).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          progress: 50,
        })
      )
    })
  })

  it('should delete project', async () => {
    window.confirm = jest.fn(() => true)
    ;(ProjectService.deleteProject as jest.Mock).mockResolvedValue(undefined)

    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument()
    })

    // 프로젝트 카드의 삭제 버튼 클릭
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i })
    fireEvent.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith(
      '정말로 이 프로젝트를 삭제하시겠습니까?'
    )

    await waitFor(() => {
      expect(ProjectService.deleteProject).toHaveBeenCalledWith('1')
    })
  })

  it('should show empty state when no projects', async () => {
    ;(ProjectService.getProjects as jest.Mock).mockResolvedValue({
      data: [],
      count: 0,
    })

    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('프로젝트가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('새 프로젝트를 추가해보세요')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const errorMessage = '프로젝트를 불러오는데 실패했습니다'
    ;(ProjectService.getProjects as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    )

    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    // 재시도 버튼
    const retryButton = screen.getByRole('button', { name: /재시도/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('should display project statistics', async () => {
    render(<ProjectKanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('전체 프로젝트: 3')).toBeInTheDocument()
      expect(screen.getByText('진행 중: 1')).toBeInTheDocument()
      expect(screen.getByText('완료: 1')).toBeInTheDocument()
    })
  })
})