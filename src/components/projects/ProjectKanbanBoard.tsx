'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
// import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createBrowserClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  total_revenue: number;
  total_cost: number;
  status: 'active' | 'completed' | 'on_hold' | 'canceled';
  start_date?: string;
  end_date?: string;
  created_at: string;
  quotes: {
    id: string;
    quote_number: string;
    customer_name_snapshot: string;
  };
}

interface KanbanColumn {
  id: string;
  title: string;
  status: Project['status'];
  color: string;
  projects: Project[];
}

interface ProjectKanbanBoardProps {
  onProjectClick?: (projectId: string) => void;
  onProjectUpdate?: () => void;
}

export default function ProjectKanbanBoard({
  onProjectClick,
  onProjectUpdate,
}: ProjectKanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'active',
      title: '진행중',
      status: 'active',
      color: '#2196f3',
      projects: [],
    },
    {
      id: 'on_hold',
      title: '보류',
      status: 'on_hold',
      color: '#ff9800',
      projects: [],
    },
    {
      id: 'completed',
      title: '완료',
      status: 'completed',
      color: '#4caf50',
      projects: [],
    },
    {
      id: 'canceled',
      title: '취소',
      status: 'canceled',
      color: '#f44336',
      projects: [],
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const supabase = createBrowserClient();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          quotes!inner(id, quote_number, customer_name_snapshot)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 프로젝트를 상태별로 분류
      const updatedColumns = columns.map((column) => ({
        ...column,
        projects:
          data?.filter((project) => project.status === column.status) || [],
      }));

      setColumns(updatedColumns);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusChange = async (
    projectId: string,
    newStatus: Project['status']
  ) => {
    try {
      // 데이터베이스 업데이트
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;

      // 로컬 상태 업데이트
      await fetchProjects();

      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (err: any) {
      console.error('Error updating project status:', err);
      setError(err.message);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    project: Project
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleViewProject = () => {
    if (selectedProject && onProjectClick) {
      onProjectClick(selectedProject.id);
    }
    handleMenuClose();
  };

  const getProjectProfitMargin = (project: Project) => {
    if (project.total_revenue === 0) return 0;
    return (
      ((project.total_revenue - project.total_cost) / project.total_revenue) *
      100
    );
  };

  const getProjectProfitColor = (profitMargin: number) => {
    if (profitMargin >= 20) return '#4caf50'; // 녹색
    if (profitMargin >= 10) return '#ff9800'; // 주황색
    return '#f44336'; // 빨간색
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height={400}
      >
        <Typography>프로젝트를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Typography color='error' mb={2}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2}>
        {columns.map((column) => (
          <Grid item xs={12} sm={6} md={3} key={column.id}>
            <Paper
              elevation={1}
              sx={{
                minHeight: 500,
                backgroundColor: '#fafafa',
                borderTop: `4px solid ${column.color}`,
              }}
            >
              <Box p={2}>
                <Box display='flex' alignItems='center' mb={2}>
                  <Typography
                    variant='h6'
                    sx={{ color: column.color, fontWeight: 'bold' }}
                  >
                    {column.title}
                  </Typography>
                  <Chip
                    size='small'
                    label={column.projects.length}
                    sx={{
                      ml: 1,
                      backgroundColor: column.color,
                      color: 'white',
                    }}
                  />
                </Box>

                <Box sx={{ minHeight: 400 }}>
                  {column.projects.map((project) => (
                    <Card
                      key={project.id}
                      sx={{
                        mb: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 3,
                        },
                      }}
                      onClick={() =>
                        onProjectClick && onProjectClick(project.id)
                      }
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box
                          display='flex'
                          justifyContent='space-between'
                          alignItems='flex-start'
                          mb={1}
                        >
                          <Typography
                            variant='subtitle2'
                            fontWeight='bold'
                            noWrap
                            sx={{ flex: 1, mr: 1 }}
                          >
                            {project.name}
                          </Typography>
                          <IconButton
                            size='small'
                            onClick={(e) => handleMenuOpen(e, project)}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>

                        <Typography
                          variant='body2'
                          color='text.secondary'
                          gutterBottom
                          noWrap
                        >
                          {project.quotes.customer_name_snapshot}
                        </Typography>

                        <Typography
                          variant='caption'
                          color='text.secondary'
                          display='block'
                          gutterBottom
                        >
                          {project.quotes.quote_number}
                        </Typography>

                        <Box mt={1}>
                          <Typography
                            variant='body2'
                            sx={{ fontSize: '0.75rem' }}
                          >
                            매출:{' '}
                            <strong>
                              {project.total_revenue.toLocaleString()}원
                            </strong>
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontSize: '0.75rem' }}
                          >
                            원가:{' '}
                            <strong>
                              {project.total_cost.toLocaleString()}원
                            </strong>
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{
                              fontSize: '0.75rem',
                              color: getProjectProfitColor(
                                getProjectProfitMargin(project)
                              ),
                            }}
                          >
                            수익률:{' '}
                            <strong>
                              {getProjectProfitMargin(project).toFixed(1)}%
                            </strong>
                          </Typography>
                        </Box>

                        {project.start_date && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            display='block'
                            mt={1}
                          >
                            {project.start_date} ~ {project.end_date || '미정'}
                          </Typography>
                        )}

                        <Typography
                          variant='caption'
                          color='text.secondary'
                          display='block'
                          mt={0.5}
                        >
                          생성:{' '}
                          {new Date(project.created_at).toLocaleDateString()}
                        </Typography>

                        {/* 상태 변경 버튼들 */}
                        <Box
                          display='flex'
                          gap={0.5}
                          mt={1}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {columns
                            .filter((col) => col.status !== project.status)
                            .map((col) => (
                              <Button
                                key={col.id}
                                size='small'
                                variant='outlined'
                                sx={{
                                  minWidth: 'auto',
                                  px: 1,
                                  fontSize: '0.7rem',
                                  borderColor: col.color,
                                  color: col.color,
                                  '&:hover': {
                                    backgroundColor: col.color,
                                    color: 'white',
                                  },
                                }}
                                onClick={() =>
                                  handleStatusChange(project.id, col.status)
                                }
                              >
                                {col.title}
                              </Button>
                            ))}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  {column.projects.length === 0 && (
                    <Box
                      display='flex'
                      justifyContent='center'
                      alignItems='center'
                      height={200}
                      sx={{
                        border: '2px dashed #ddd',
                        borderRadius: 1,
                        color: 'text.secondary',
                      }}
                    >
                      <Typography variant='body2'>
                        프로젝트가 없습니다
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 프로젝트 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewProject}>
          <ViewIcon sx={{ mr: 1 }} />
          상세보기
        </MenuItem>
      </Menu>
    </Box>
  );
}
