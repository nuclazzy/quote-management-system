// ========================================
// 실시간 충돌 감지 및 해결 UI 컴포넌트
// REALTIME_CONFLICT_UI.jsx
// ========================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Tooltip,
  IconButton,
  Badge,
  Fade,
  Slide,
  Zoom
} from '@mui/material';
import {
  Warning as WarningIcon,
  Sync as SyncIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Merge as MergeIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Compare as CompareIcon,
  History as HistoryIcon,
  AutoFixHigh as AutoFixIcon,
  ManualFix as ManualFixIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// ========================================
// 1. 실시간 충돌 감지 Hook
// ========================================

export const useRealtimeConflictDetection = (quoteId, currentData) => {
  const [conflicts, setConflicts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState(null);
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const conflictTimeoutRef = useRef(new Map());

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/quote/${quoteId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('🔌 WebSocket 연결됨:', quoteId);
        
        // 하트비트 시작
        heartbeatRef.current = setInterval(() => {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket 메시지 파싱 실패:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('🔌 WebSocket 연결 끊김');
        
        // 재연결 시도
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      setIsConnected(false);
    }
  }, [quoteId]);

  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'user_activity':
        handleUserActivity(message.data);
        break;
      case 'data_changed':
        handleDataChange(message.data);
        break;
      case 'conflict_detected':
        handleConflictDetected(message.data);
        break;
      case 'conflict_resolved':
        handleConflictResolved(message.data);
        break;
      case 'user_joined':
      case 'user_left':
        handleUserPresence(message.data);
        break;
      default:
        console.log('알 수 없는 WebSocket 메시지:', message);
    }
  }, []);

  const handleUserActivity = useCallback((activity) => {
    setLastActivity({
      userId: activity.userId,
      userEmail: activity.userEmail,
      action: activity.action,
      field: activity.field,
      timestamp: activity.timestamp
    });

    // 활동 표시 자동 제거
    setTimeout(() => {
      setLastActivity(prev => 
        prev?.timestamp === activity.timestamp ? null : prev
      );
    }, 5000);
  }, []);

  const handleDataChange = useCallback((changeData) => {
    // 다른 사용자의 변경사항 감지
    if (changeData.userId !== getCurrentUserId()) {
      toast.info(`${changeData.userEmail}님이 견적서를 수정했습니다`, {
        toastId: `change-${changeData.timestamp}`,
        autoClose: 3000
      });
    }
  }, []);

  const handleConflictDetected = useCallback((conflictData) => {
    const newConflict = {
      id: `conflict_${Date.now()}`,
      type: 'edit_conflict',
      severity: conflictData.severity || 'medium',
      field: conflictData.field,
      localValue: conflictData.localValue,
      remoteValue: conflictData.remoteValue,
      remoteUser: conflictData.remoteUser,
      timestamp: Date.now(),
      status: 'pending'
    };

    setConflicts(prev => [...prev, newConflict]);

    // 중요한 충돌은 즉시 알림
    if (conflictData.severity === 'high') {
      toast.error(`⚠️ ${conflictData.remoteUser}님과 동시 수정 충돌이 발생했습니다!`, {
        toastId: newConflict.id,
        autoClose: false
      });
    }

    // 자동 해결 시도 (낮은 심각도)
    if (conflictData.severity === 'low') {
      setTimeout(() => {
        attemptAutoResolve(newConflict);
      }, 2000);
    }
  }, []);

  const handleConflictResolved = useCallback((resolvedData) => {
    setConflicts(prev => 
      prev.filter(conflict => conflict.id !== resolvedData.conflictId)
    );

    toast.success('✅ 충돌이 해결되었습니다', {
      toastId: `resolved-${resolvedData.conflictId}`
    });
  }, []);

  const handleUserPresence = useCallback((presenceData) => {
    const action = presenceData.type === 'user_joined' ? '입장' : '퇴장';
    toast.info(`👤 ${presenceData.userEmail}님이 ${action}했습니다`, {
      toastId: `presence-${presenceData.userId}-${Date.now()}`,
      autoClose: 2000
    });
  }, []);

  const attemptAutoResolve = useCallback((conflict) => {
    // 간단한 자동 해결 로직
    const resolution = determineAutoResolution(conflict);
    
    if (resolution) {
      resolveConflict(conflict.id, resolution.strategy, resolution.mergedValue);
    }
  }, []);

  const sendUserActivity = useCallback((action, field, value) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_activity',
        data: {
          action,
          field,
          value: typeof value === 'string' ? value.substring(0, 50) : value,
          timestamp: Date.now()
        }
      }));
    }
  }, []);

  const resolveConflict = useCallback((conflictId, strategy, mergedValue = null) => {
    setConflicts(prev => 
      prev.map(conflict => 
        conflict.id === conflictId 
          ? { ...conflict, status: 'resolving' }
          : conflict
      )
    );

    // WebSocket으로 해결책 전송
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resolve_conflict',
        data: {
          conflictId,
          strategy,
          mergedValue,
          timestamp: Date.now()
        }
      }));
    }

    // 로컬에서 충돌 제거
    setTimeout(() => {
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
    }, 1000);
  }, []);

  // 초기화
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      conflictTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [connectWebSocket]);

  return {
    conflicts,
    isConnected,
    lastActivity,
    sendUserActivity,
    resolveConflict
  };
};

// ========================================
// 2. 메인 충돌 관리 컴포넌트
// ========================================

const RealtimeConflictManager = ({ 
  quoteId, 
  currentData, 
  onConflictResolved,
  onDataChange 
}) => {
  const {
    conflicts,
    isConnected,
    lastActivity,
    sendUserActivity,
    resolveConflict
  } = useRealtimeConflictDetection(quoteId, currentData);

  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showActivity, setShowActivity] = useState(true);

  // 충돌 해결 후 콜백
  const handleConflictResolved = useCallback((conflictId, resolution) => {
    resolveConflict(conflictId, resolution.strategy, resolution.mergedValue);
    onConflictResolved?.(conflictId, resolution);
  }, [resolveConflict, onConflictResolved]);

  return (
    <Box>
      {/* 연결 상태 표시 */}
      <ConnectionStatus isConnected={isConnected} />
      
      {/* 사용자 활동 표시 */}
      {lastActivity && showActivity && (
        <UserActivityIndicator 
          activity={lastActivity}
          onClose={() => setShowActivity(false)}
        />
      )}
      
      {/* 충돌 목록 */}
      {conflicts.length > 0 && (
        <ConflictList 
          conflicts={conflicts}
          onSelectConflict={setSelectedConflict}
        />
      )}
      
      {/* 충돌 해결 다이얼로그 */}
      {selectedConflict && (
        <ConflictResolutionDialog
          conflict={selectedConflict}
          currentData={currentData}
          onResolve={handleConflictResolved}
          onClose={() => setSelectedConflict(null)}
        />
      )}
    </Box>
  );
};

// ========================================
// 3. 연결 상태 컴포넌트
// ========================================

const ConnectionStatus = ({ isConnected }) => (
  <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
    <Fade in={!isConnected}>
      <Alert severity="warning" variant="filled" sx={{ mb: 1 }}>
        <AlertTitle>실시간 동기화 끊김</AlertTitle>
        다른 사용자와의 실시간 협업이 일시 중단되었습니다.
      </Alert>
    </Fade>
    
    <Chip
      icon={<SyncIcon />}
      label={isConnected ? '실시간 연결됨' : '연결 중...'}
      color={isConnected ? 'success' : 'warning'}
      variant={isConnected ? 'filled' : 'outlined'}
    />
  </Box>
);

// ========================================
// 4. 사용자 활동 표시 컴포넌트
// ========================================

const UserActivityIndicator = ({ activity, onClose }) => (
  <Slide direction="down" in={true} timeout={300}>
    <Alert 
      severity="info" 
      variant="outlined"
      onClose={onClose}
      sx={{ 
        position: 'fixed', 
        top: 80, 
        right: 16, 
        zIndex: 9998,
        minWidth: 300
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon fontSize="small" />
        <Typography variant="body2">
          <strong>{activity.userEmail}</strong>님이 
          <Chip 
            label={activity.field} 
            size="small" 
            variant="outlined" 
            sx={{ mx: 0.5 }}
          />
          을(를) {activity.action}하고 있습니다
        </Typography>
      </Box>
    </Alert>
  </Slide>
);

// ========================================
// 5. 충돌 목록 컴포넌트
// ========================================

const ConflictList = ({ conflicts, onSelectConflict }) => (
  <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9997 }}>
    {conflicts.map((conflict, index) => (
      <Zoom key={conflict.id} in={true} timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
        <Alert 
          severity={getSeverityColor(conflict.severity)}
          variant="filled"
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => onSelectConflict(conflict)}
            >
              <MergeIcon />
            </IconButton>
          }
          sx={{ mb: 1, cursor: 'pointer' }}
          onClick={() => onSelectConflict(conflict)}
        >
          <AlertTitle>충돌 감지됨</AlertTitle>
          {conflict.remoteUser}님과 {conflict.field} 필드에서 충돌이 발생했습니다.
        </Alert>
      </Zoom>
    ))}
  </Box>
);

// ========================================
// 6. 충돌 해결 다이얼로그
// ========================================

const ConflictResolutionDialog = ({ 
  conflict, 
  currentData, 
  onResolve, 
  onClose 
}) => {
  const [resolution, setResolution] = useState('merge');
  const [mergedValue, setMergedValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 자동 병합 시도
    if (conflict.type === 'edit_conflict') {
      const autoMerged = attemptAutoMerge(conflict.localValue, conflict.remoteValue);
      setMergedValue(autoMerged);
    }
  }, [conflict]);

  const handleResolve = () => {
    const resolutionData = {
      strategy: resolution,
      mergedValue: resolution === 'merge' ? mergedValue : 
                   resolution === 'local' ? conflict.localValue : 
                   conflict.remoteValue,
      timestamp: Date.now()
    };

    onResolve(conflict.id, resolutionData);
    onClose();
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        충돌 해결
        <Chip 
          label={conflict.severity} 
          color={getSeverityColor(conflict.severity)}
          size="small"
        />
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* 충돌 정보 */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  충돌 정보
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip icon={<EditIcon />} label={`필드: ${conflict.field}`} />
                  <Chip icon={<PersonIcon />} label={`상대방: ${conflict.remoteUser}`} />
                  <Chip icon={<ScheduleIcon />} label={formatTime(conflict.timestamp)} />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {conflict.remoteUser}님이 같은 필드를 동시에 수정하여 충돌이 발생했습니다.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 값 비교 */}
          <Grid item xs={12}>
            <ValueComparison
              localValue={conflict.localValue}
              remoteValue={conflict.remoteValue}
              mergedValue={mergedValue}
              field={conflict.field}
            />
          </Grid>

          {/* 해결 방법 선택 */}
          <Grid item xs={12}>
            <ResolutionOptions
              resolution={resolution}
              onResolutionChange={setResolution}
              onMergedValueChange={setMergedValue}
              mergedValue={mergedValue}
              conflict={conflict}
            />
          </Grid>

          {/* 세부 정보 (접을 수 있음) */}
          <Grid item xs={12}>
            <Accordion expanded={showDetails} onChange={(e, expanded) => setShowDetails(expanded)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">세부 정보</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ConflictTimeline conflict={conflict} />
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          취소
        </Button>
        <Button 
          onClick={handleResolve}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          color="primary"
        >
          해결하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========================================
// 7. 값 비교 컴포넌트
// ========================================

const ValueComparison = ({ localValue, remoteValue, mergedValue, field }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompareIcon />
        값 비교
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom color="primary.contrastText">
              내 변경사항
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {formatValue(localValue, field)}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom color="warning.contrastText">
              상대방 변경사항
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {formatValue(remoteValue, field)}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom color="success.contrastText">
              병합 결과 (추천)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {formatValue(mergedValue, field)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

// ========================================
// 8. 해결 방법 선택 컴포넌트
// ========================================

const ResolutionOptions = ({ 
  resolution, 
  onResolutionChange, 
  onMergedValueChange, 
  mergedValue, 
  conflict 
}) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="h6" gutterBottom>
        해결 방법
      </Typography>
      
      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={resolution}
          onChange={(e) => onResolutionChange(e.target.value)}
        >
          <FormControlLabel
            value="local"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">내 변경사항 사용</Typography>
                <Typography variant="body2" color="text.secondary">
                  내가 작성한 내용을 유지하고 상대방의 변경사항을 무시합니다.
                </Typography>
              </Box>
            }
          />
          
          <FormControlLabel
            value="remote"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">상대방 변경사항 사용</Typography>
                <Typography variant="body2" color="text.secondary">
                  {conflict.remoteUser}님의 변경사항을 채택하고 내 변경사항을 포기합니다.
                </Typography>
              </Box>
            }
          />
          
          <FormControlLabel
            value="merge"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">수동 병합</Typography>
                <Typography variant="body2" color="text.secondary">
                  두 변경사항을 조합하여 새로운 값을 만듭니다.
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      {resolution === 'merge' && (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="병합된 값"
            value={mergedValue}
            onChange={(e) => onMergedValueChange(e.target.value)}
            helperText="두 변경사항을 참고하여 최종 값을 입력하세요."
          />
        </Box>
      )}
    </CardContent>
  </Card>
);

// ========================================
// 9. 충돌 타임라인 컴포넌트
// ========================================

const ConflictTimeline = ({ conflict }) => (
  <Timeline>
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color="primary">
          <EditIcon />
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Typography variant="h6">내가 수정함</Typography>
        <Typography color="text.secondary">
          {formatTime(conflict.timestamp - 5000)} (추정)
        </Typography>
      </TimelineContent>
    </TimelineItem>
    
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color="warning">
          <PersonIcon />
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Typography variant="h6">{conflict.remoteUser}님이 수정함</Typography>
        <Typography color="text.secondary">
          {formatTime(conflict.timestamp - 2000)} (추정)
        </Typography>
      </TimelineContent>
    </TimelineItem>
    
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color="error">
          <WarningIcon />
        </TimelineDot>
      </TimelineSeparator>
      <TimelineContent>
        <Typography variant="h6">충돌 감지됨</Typography>
        <Typography color="text.secondary">
          {formatTime(conflict.timestamp)}
        </Typography>
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);

// ========================================
// 10. 유틸리티 함수들
// ========================================

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'error';
    default: return 'warning';
  }
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('ko-KR');
};

const formatValue = (value, field) => {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value || '');
};

const attemptAutoMerge = (localValue, remoteValue) => {
  // 간단한 자동 병합 로직
  if (typeof localValue === 'string' && typeof remoteValue === 'string') {
    if (localValue.length > remoteValue.length) {
      return localValue;
    } else {
      return remoteValue;
    }
  }
  
  return remoteValue; // 기본값
};

const determineAutoResolution = (conflict) => {
  // 자동 해결이 가능한 경우의 로직
  if (conflict.severity === 'low') {
    return {
      strategy: 'merge',
      mergedValue: attemptAutoMerge(conflict.localValue, conflict.remoteValue)
    };
  }
  
  return null;
};

const getCurrentUserId = () => {
  // 현재 사용자 ID 반환 (구현에 따라 다름)
  return localStorage.getItem('userId') || 'anonymous';
};

export default RealtimeConflictManager;

// ========================================
// 11. 사용 예시
// ========================================

/*
// 견적서 편집기에서 사용
const QuoteEditor = ({ quoteId, initialData }) => {
  const [quoteData, setQuoteData] = useState(initialData);

  const handleConflictResolved = (conflictId, resolution) => {
    console.log('충돌 해결됨:', conflictId, resolution);
    // 해결된 데이터로 상태 업데이트
    if (resolution.mergedValue) {
      setQuoteData(prev => ({
        ...prev,
        // 필드별 업데이트 로직
      }));
    }
  };

  const handleDataChange = (newData) => {
    setQuoteData(newData);
  };

  return (
    <div>
      <RealtimeConflictManager
        quoteId={quoteId}
        currentData={quoteData}
        onConflictResolved={handleConflictResolved}
        onDataChange={handleDataChange}
      />
      
      {/* 견적서 편집 UI */}
      <div>견적서 편집 폼...</div>
    </div>
  );
};
*/