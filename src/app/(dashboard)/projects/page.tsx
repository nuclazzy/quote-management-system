'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import { createBrowserClient } from '@/lib/supabase/client';
import LoadingState from '@/components/common/LoadingState';
import ErrorAlert from '@/components/common/ErrorAlert';
import ProjectKanbanBoard from '@/components/projects/ProjectKanbanBoard';

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

interface ProjectWithProfitability extends Project {
  net_profit: number;
  profit_margin: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] =
    useState<ProjectWithProfitability | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusUpdateDialog, setStatusUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<Project['status']>('active');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

      // 수익성 계산
      const projectsWithProfitability = data.map((project) => ({
        ...project,
        net_profit: project.total_revenue - project.total_cost,
        profit_margin:
          project.total_revenue > 0
            ? ((project.total_revenue - project.total_cost) /
                project.total_revenue) *
              100
            : 0,
      }));

      setProjects(projectsWithProfitability);
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

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    project: ProjectWithProfitability
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleViewProject = () => {
    if (selectedProject) {
      router.push(`/projects/${selectedProject.id}`);
    }
    handleMenuClose();
  };

  const handleUpdateStatus = () => {
    setNewStatus(selectedProject?.status || 'active');
    setStatusUpdateDialog(true);
    handleMenuClose();
  };

  const handleStatusUpdate = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', selectedProject.id);

      if (error) throw error;

      await fetchProjects();
      setStatusUpdateDialog(false);
    } catch (err: any) {
      console.error('Error updating project status:', err);
      setError(err.message);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'on_hold':
        return 'warning';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      case 'on_hold':
        return '보류';
      case 'canceled':
        return '취소';
      default:
        return status;
    }
  };

  const filteredProjects = projects.filter(
    (project) => statusFilter === 'all' || project.status === statusFilter
  );

  if (loading) return <LoadingState />;

  return (
    <Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4' component='h1'>
          프로젝트 관리
        </Typography>
        <Box display='flex' gap={2} alignItems='center'>
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>상태 필터</InputLabel>
            <Select
              value={statusFilter}
              label='상태 필터'
              onChange={(e: SelectChangeEvent) =>
                setStatusFilter(e.target.value)
              }
            >
              <MenuItem value='all'>전체</MenuItem>
              <MenuItem value='active'>진행중</MenuItem>
              <MenuItem value='completed'>완료</MenuItem>
              <MenuItem value='on_hold'>보류</MenuItem>
              <MenuItem value='canceled'>취소</MenuItem>
            </Select>
          </FormControl>
          <Box display='flex' gap={1}>
            <IconButton
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
            >
              <ViewListIcon />
            </IconButton>
            <IconButton
              onClick={() => setViewMode('kanban')}
              color={viewMode === 'kanban' ? 'primary' : 'default'}
            >
              <ViewModuleIcon />
            </IconButton>
          </Box>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => router.push('/quotes')}
          >
            새 견적서
          </Button>
        </Box>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      {viewMode === 'kanban' ? (
        <ProjectKanbanBoard
          onProjectClick={(projectId) => router.push(`/projects/${projectId}`)}
          onProjectUpdate={fetchProjects}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card>
                <CardContent>
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='flex-start'
                    mb={2}
                  >
                    <Typography variant='h6' component='h2' noWrap>
                      {project.name}
                    </Typography>
                    <IconButton
                      size='small'
                      onClick={(e) => handleMenuOpen(e, project)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography
                    variant='body2'
                    color='text.secondary'
                    gutterBottom
                  >
                    고객: {project.quotes.customer_name_snapshot}
                  </Typography>

                  <Typography
                    variant='body2'
                    color='text.secondary'
                    gutterBottom
                  >
                    견적번호: {project.quotes.quote_number}
                  </Typography>

                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='center'
                    my={2}
                  >
                    <Chip
                      label={getStatusText(project.status)}
                      color={getStatusColor(project.status)}
                      size='small'
                    />
                    <Typography variant='body2' color='text.secondary'>
                      {new Date(project.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <Typography variant='body2'>
                      총 매출:{' '}
                      <strong>
                        {project.total_revenue.toLocaleString()}원
                      </strong>
                    </Typography>
                    <Typography variant='body2'>
                      총 원가:{' '}
                      <strong>{project.total_cost.toLocaleString()}원</strong>
                    </Typography>
                    <Typography
                      variant='body2'
                      color={
                        project.net_profit >= 0 ? 'success.main' : 'error.main'
                      }
                    >
                      순이익:{' '}
                      <strong>{project.net_profit.toLocaleString()}원</strong>
                    </Typography>
                    <Typography
                      variant='body2'
                      color={
                        project.profit_margin >= 0
                          ? 'success.main'
                          : 'error.main'
                      }
                    >
                      수익률:{' '}
                      <strong>{project.profit_margin.toFixed(1)}%</strong>
                    </Typography>
                  </Box>

                  {project.start_date && (
                    <Typography variant='body2' color='text.secondary' mt={1}>
                      기간: {project.start_date} ~ {project.end_date || '미정'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredProjects.length === 0 && (
        <Box textAlign='center' py={4}>
          <Typography variant='h6' color='text.secondary'>
            프로젝트가 없습니다
          </Typography>
          <Typography variant='body2' color='text.secondary' mb={2}>
            견적서를 승인하여 프로젝트를 생성하세요
          </Typography>
          <Button variant='outlined' onClick={() => router.push('/quotes')}>
            견적서 관리로 이동
          </Button>
        </Box>
      )}

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
        <MenuItem onClick={handleUpdateStatus}>
          <EditIcon sx={{ mr: 1 }} />
          상태 변경
        </MenuItem>
      </Menu>

      {/* 상태 변경 다이얼로그 */}
      <Dialog
        open={statusUpdateDialog}
        onClose={() => setStatusUpdateDialog(false)}
      >
        <DialogTitle>프로젝트 상태 변경</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>상태</InputLabel>
            <Select
              value={newStatus}
              label='상태'
              onChange={(e: SelectChangeEvent<Project['status']>) =>
                setNewStatus(e.target.value as Project['status'])
              }
            >
              <MenuItem value='active'>진행중</MenuItem>
              <MenuItem value='completed'>완료</MenuItem>
              <MenuItem value='on_hold'>보류</MenuItem>
              <MenuItem value='canceled'>취소</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateDialog(false)}>취소</Button>
          <Button onClick={handleStatusUpdate} variant='contained'>
            변경
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
