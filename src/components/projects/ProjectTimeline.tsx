'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { createBrowserClient } from '@/lib/supabase/client';

interface TimelineEvent {
  id: string;
  project_id: string;
  event_type: 'status_change' | 'assignment' | 'milestone' | 'transaction' | 'note';
  title: string;
  description?: string;
  event_date: string;
  created_at: string;
  created_by: string;
  metadata?: any;
}

interface ProjectTimelineProps {
  projectId: string;
  onUpdate?: () => void;
}

export default function ProjectTimeline({ projectId, onUpdate }: ProjectTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addEventDialog, setAddEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_type: 'note' as TimelineEvent['event_type'],
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
  });

  const supabase = createBrowserClient();

  const fetchTimelineEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll create mock data since we don't have the timeline_events table yet
      // In a real implementation, this would fetch from the database
      const mockEvents: TimelineEvent[] = [
        {
          id: '1',
          project_id: projectId,
          event_type: 'status_change',
          title: '프로젝트 생성',
          description: '견적서에서 프로젝트로 전환됨',
          event_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          created_by: 'system',
          metadata: { from_status: null, to_status: 'active' },
        },
        {
          id: '2',
          project_id: projectId,
          event_type: 'assignment',
          title: '담당자 지정',
          description: '프로젝트 담당자가 지정되었습니다',
          event_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          created_by: 'admin',
          metadata: { assignee: '김담당' },
        },
      ];

      setEvents(mockEvents);
    } catch (err: any) {
      console.error('Error fetching timeline events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineEvents();
  }, [projectId]);

  const handleAddEvent = async () => {
    try {
      // This would normally insert into the timeline_events table
      const newTimelineEvent: TimelineEvent = {
        id: Date.now().toString(),
        project_id: projectId,
        ...newEvent,
        created_at: new Date().toISOString(),
        created_by: 'current_user', // This would be the actual user ID
      };

      setEvents(prev => [newTimelineEvent, ...prev]);
      setAddEventDialog(false);
      setNewEvent({
        event_type: 'note',
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Error adding timeline event:', err);
      setError(err.message);
    }
  };

  const getEventIcon = (eventType: TimelineEvent['event_type']) => {
    switch (eventType) {
      case 'status_change':
        return <BuildIcon />;
      case 'assignment':
        return <PersonIcon />;
      case 'milestone':
        return <CheckIcon />;
      case 'transaction':
        return <MoneyIcon />;
      case 'note':
        return <EventIcon />;
      default:
        return <EventIcon />;
    }
  };

  const getEventColor = (eventType: TimelineEvent['event_type']) => {
    switch (eventType) {
      case 'status_change':
        return 'primary';
      case 'assignment':
        return 'secondary';
      case 'milestone':
        return 'success';
      case 'transaction':
        return 'warning';
      case 'note':
        return 'info';
      default:
        return 'grey';
    }
  };

  const getEventTypeText = (eventType: TimelineEvent['event_type']) => {
    const typeMap = {
      status_change: '상태 변경',
      assignment: '담당자 지정',
      milestone: '마일스톤',
      transaction: '거래',
      note: '메모',
    };
    return typeMap[eventType] || eventType;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={200}>
        <Typography>타임라인을 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">프로젝트 타임라인</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddEventDialog(true)}
        >
          이벤트 추가
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        {events.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              타임라인 이벤트가 없습니다
            </Typography>
          </Box>
        ) : (
          <Timeline>
            {events.map((event, index) => (
              <TimelineItem key={event.id}>
                <TimelineOppositeContent sx={{ m: 'auto 0', minWidth: 120 }}>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(event.event_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(event.event_date).toLocaleTimeString()}
                  </Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={getEventColor(event.event_type) as any}>
                    {getEventIcon(event.event_type)}
                  </TimelineDot>
                  {index < events.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ py: '12px', px: 2 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6" component="span">
                      {event.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={getEventTypeText(event.event_type)}
                      color={getEventColor(event.event_type) as any}
                      variant="outlined"
                    />
                  </Box>
                  {event.description && (
                    <Typography color="text.secondary" variant="body2">
                      {event.description}
                    </Typography>
                  )}
                  {event.metadata && (
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        {JSON.stringify(event.metadata, null, 2)}
                      </Typography>
                    </Box>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Paper>

      {/* 이벤트 추가 다이얼로그 */}
      <Dialog
        open={addEventDialog}
        onClose={() => setAddEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>타임라인 이벤트 추가</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>이벤트 유형</InputLabel>
              <Select
                value={newEvent.event_type}
                label="이벤트 유형"
                onChange={(e: SelectChangeEvent<TimelineEvent['event_type']>) =>
                  setNewEvent(prev => ({
                    ...prev,
                    event_type: e.target.value as TimelineEvent['event_type'],
                  }))
                }
              >
                <MenuItem value="note">메모</MenuItem>
                <MenuItem value="milestone">마일스톤</MenuItem>
                <MenuItem value="status_change">상태 변경</MenuItem>
                <MenuItem value="assignment">담당자 지정</MenuItem>
                <MenuItem value="transaction">거래</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="제목"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent(prev => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="날짜"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={newEvent.event_date}
              onChange={(e) =>
                setNewEvent(prev => ({
                  ...prev,
                  event_date: e.target.value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEventDialog(false)}>취소</Button>
          <Button onClick={handleAddEvent} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}