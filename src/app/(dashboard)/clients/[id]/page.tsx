'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Business,
  Person,
  Phone,
  Email,
  LocationOn,
  Payment,
  Percent,
  Description,
  Add,
  Event,
  AccountBalance,
  TrendingUp,
  Assignment,
  AttachMoney,
  CalendarToday,
} from '@mui/icons-material';
import { useStaticAuth } from '@/contexts/StaticAuthContext';
import LoadingState from '@/components/common/LoadingState';
import ErrorAlert from '@/components/common/ErrorAlert';

interface ClientData {
  client: {
    id: string;
    name: string;
    business_number: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    payment_terms: string;
    discount_rate: number;
    notes: string;
    status: 'active' | 'inactive';
    created_at: string;
  };
  stats: {
    totalQuotes: number;
    acceptedQuotes: number;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    pendingTransactions: number;
    completedTransactions: number;
  };
  quotes: any[];
  projects: any[];
  transactions: any[];
  recentActivities: any[];
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  duration_minutes: number;
  meeting_type: string;
  participants: string[];
  agenda?: string;
  notes?: string;
  follow_up_actions?: string;
  next_meeting_date?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function ClientDetailPage() {
  const { user } = useStaticAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [meetingDialog, setMeetingDialog] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meeting_date: '',
    duration_minutes: 60,
    meeting_type: 'meeting',
    participants: [''],
    agenda: '',
    notes: '',
    follow_up_actions: '',
    next_meeting_date: '',
  });

  useEffect(() => {
    if (clientId) {
      fetchClientData();
      fetchMeetings();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/clients/${clientId}/transactions`);
      if (!response.ok) {
        throw new Error('클라이언트 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setClientData(data);
    } catch (err: any) {
      console.error('Error fetching client data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/meetings`);
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMeeting,
          participants: newMeeting.participants.filter(p => p.trim()),
        }),
      });

      if (response.ok) {
        setMeetingDialog(false);
        setNewMeeting({
          title: '',
          meeting_date: '',
          duration_minutes: 60,
          meeting_type: 'meeting',
          participants: [''],
          agenda: '',
          notes: '',
          follow_up_actions: '',
          next_meeting_date: '',
        });
        fetchMeetings();
      } else {
        throw new Error('미팅 기록 생성에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote':
        return <Assignment color="primary" />;
      case 'project':
        return <Business color="success" />;
      case 'transaction':
        return <AttachMoney color="warning" />;
      default:
        return <Description />;
    }
  };

  const getStatusChip = (status: string, type: string) => {
    const statusMap: { [key: string]: { label: string; color: any } } = {
      // 견적서 상태
      draft: { label: '초안', color: 'default' },
      submitted: { label: '제출됨', color: 'info' },
      accepted: { label: '승인됨', color: 'success' },
      rejected: { label: '거절됨', color: 'error' },
      // 프로젝트 상태
      active: { label: '진행중', color: 'primary' },
      completed: { label: '완료', color: 'success' },
      on_hold: { label: '보류', color: 'warning' },
      canceled: { label: '취소', color: 'error' },
      // 거래 상태
      pending: { label: '대기', color: 'warning' },
      processing: { label: '처리중', color: 'info' },
      issue: { label: '이슈', color: 'error' },
    };

    const statusInfo = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorAlert message={error} onClose={() => setError(null)} />;
  if (!clientData) return <Typography>클라이언트 정보를 찾을 수 없습니다.</Typography>;

  const { client, stats, quotes, projects, transactions, recentActivities } = clientData;

  return (
    <Box>
      {/* 헤더 */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {client.name}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => router.push(`/clients/${client.id}/edit`)}
        >
          정보 수정
        </Button>
      </Box>

      {/* 클라이언트 기본 정보 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Business sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      사업자번호:
                    </Typography>
                  </Box>
                  <Typography variant="body1">{client.business_number}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Person sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      담당자:
                    </Typography>
                  </Box>
                  <Typography variant="body1">{client.contact_person}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      전화번호:
                    </Typography>
                  </Box>
                  <Typography variant="body1">{client.phone || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      이메일:
                    </Typography>
                  </Box>
                  <Typography variant="body1">{client.email || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      주소:
                    </Typography>
                  </Box>
                  <Typography variant="body1">{client.address || '-'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                거래 조건
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Payment sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    결제 조건
                  </Typography>
                  <Typography variant="body1">{client.payment_terms}</Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Percent sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    할인율
                  </Typography>
                  <Typography variant="body1">{client.discount_rate}%</Typography>
                </Box>
              </Box>
              <Chip 
                label={client.status === 'active' ? '활성' : '비활성'}
                color={client.status === 'active' ? 'success' : 'default'}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 통계 카드 */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.totalQuotes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 견적서
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.totalProjects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                프로젝트
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {formatCurrency(stats.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 매출
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                color={stats.totalProfit >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(stats.totalProfit)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                순이익
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="최근 활동" />
          <Tab label="견적서" />
          <Tab label="프로젝트" />
          <Tab label="거래 내역" />
          <Tab label="미팅 기록" />
        </Tabs>
      </Paper>

      {/* 탭 컨텐츠 */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              최근 활동
            </Typography>
            <List>
              {recentActivities.map((activity, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(activity.date)} • {formatCurrency(activity.amount || 0)}
                        </Typography>
                      </Box>
                    }
                  />
                  {getStatusChip(activity.status, activity.type)}
                </ListItem>
              ))}
              {recentActivities.length === 0 && (
                <ListItem>
                  <ListItemText primary="활동 내역이 없습니다." />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              견적서 ({quotes.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>견적서 번호</TableCell>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>생성일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>{quote.quote_number}</TableCell>
                      <TableCell>{quote.project_name}</TableCell>
                      <TableCell>{getStatusChip(quote.status, 'quote')}</TableCell>
                      <TableCell align="right">{formatCurrency(quote.total_amount)}</TableCell>
                      <TableCell>{formatDate(quote.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {quotes.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                견적서가 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              프로젝트 ({projects.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트명</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="right">매출</TableCell>
                    <TableCell align="right">수익률</TableCell>
                    <TableCell>시작일</TableCell>
                    <TableCell>종료일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{getStatusChip(project.status, 'project')}</TableCell>
                      <TableCell align="right">{formatCurrency(project.total_revenue || 0)}</TableCell>
                      <TableCell align="right">{project.profit_margin || 0}%</TableCell>
                      <TableCell>{project.start_date ? formatDate(project.start_date) : '-'}</TableCell>
                      <TableCell>{project.end_date ? formatDate(project.end_date) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {projects.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                프로젝트가 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              거래 내역 ({transactions.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로젝트</TableCell>
                    <TableCell>구분</TableCell>
                    <TableCell>항목</TableCell>
                    <TableCell>거래처</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>생성일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.projects?.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.type === 'income' ? '수입' : '지출'}
                          color={transaction.type === 'income' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{transaction.item_name}</TableCell>
                      <TableCell>{transaction.partner_name}</TableCell>
                      <TableCell align="right">
                        <Typography
                          color={transaction.type === 'income' ? 'primary.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(transaction.status, 'transaction')}</TableCell>
                      <TableCell>{formatDate(transaction.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {transactions.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                거래 내역이 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                미팅 기록 ({meetings.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setMeetingDialog(true)}
              >
                미팅 기록 추가
              </Button>
            </Box>
            
            <List>
              {meetings.map((meeting, index) => (
                <ListItem key={meeting.id} divider>
                  <ListItemIcon>
                    <Event color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(meeting.meeting_date)} • {meeting.duration_minutes}분 • {meeting.meeting_type}
                        </Typography>
                        {meeting.agenda && (
                          <Typography variant="body2" color="text.secondary">
                            안건: {meeting.agenda}
                          </Typography>
                        )}
                        {meeting.notes && (
                          <Typography variant="body2" color="text.secondary">
                            내용: {meeting.notes}
                          </Typography>
                        )}
                        {meeting.participants.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            참석자: {meeting.participants.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {meetings.length === 0 && (
                <ListItem>
                  <ListItemText primary="미팅 기록이 없습니다." />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 메모 */}
      {client.notes && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Description sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6">메모</Typography>
            </Box>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {client.notes}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 미팅 추가 다이얼로그 */}
      <Dialog open={meetingDialog} onClose={() => setMeetingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>미팅 기록 추가</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="미팅 제목"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="미팅 일시"
                type="datetime-local"
                value={newMeeting.meeting_date}
                onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="소요 시간 (분)"
                type="number"
                value={newMeeting.duration_minutes}
                onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) || 60 })}
                inputProps={{ min: 15, max: 480 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>미팅 유형</InputLabel>
                <Select
                  value={newMeeting.meeting_type}
                  label="미팅 유형"
                  onChange={(e) => setNewMeeting({ ...newMeeting, meeting_type: e.target.value })}
                >
                  <MenuItem value="meeting">회의</MenuItem>
                  <MenuItem value="call">전화</MenuItem>
                  <MenuItem value="email">이메일</MenuItem>
                  <MenuItem value="visit">방문</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="참석자 (쉼표로 구분)"
                value={newMeeting.participants.join(', ')}
                onChange={(e) => setNewMeeting({ 
                  ...newMeeting, 
                  participants: e.target.value.split(',').map(p => p.trim())
                })}
                placeholder="홍길동, 김철수, 박영희"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="안건"
                multiline
                rows={2}
                value={newMeeting.agenda}
                onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="미팅 내용"
                multiline
                rows={3}
                value={newMeeting.notes}
                onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="후속 조치"
                multiline
                rows={2}
                value={newMeeting.follow_up_actions}
                onChange={(e) => setNewMeeting({ ...newMeeting, follow_up_actions: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMeetingDialog(false)}>취소</Button>
          <Button 
            onClick={handleCreateMeeting}
            variant="contained"
            disabled={!newMeeting.title || !newMeeting.meeting_date}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}