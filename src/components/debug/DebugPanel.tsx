'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface DebugStep {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
  timestamp?: Date;
}

interface DebugPanelProps {
  steps: DebugStep[];
  onClearLogs?: () => void;
  visible?: boolean;
}

const statusIcons = {
  pending: <InfoIcon color="disabled" />,
  loading: <InfoIcon color="primary" />,
  success: <CheckIcon color="success" />,
  error: <ErrorIcon color="error" />,
  warning: <WarningIcon color="warning" />
};

const statusColors = {
  pending: 'default' as const,
  loading: 'primary' as const,
  success: 'success' as const,
  error: 'error' as const,
  warning: 'warning' as const
};

export default function DebugPanel({ steps, onClearLogs, visible = true }: DebugPanelProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  useEffect(() => {
    // 에러나 워닝이 발생하면 자동으로 패널 표시
    const hasErrors = steps.some(step => step.status === 'error' || step.status === 'warning');
    if (hasErrors && !isVisible) {
      setIsVisible(true);
    }
  }, [steps, isVisible]);

  if (!isVisible) {
    return (
      <Button
        variant="outlined"
        size="small"
        onClick={() => setIsVisible(true)}
        startIcon={<VisibilityIcon />}
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 1000,
          bgcolor: 'background.paper'
        }}
      >
        디버그 정보 표시
      </Button>
    );
  }

  const errorCount = steps.filter(s => s.status === 'error').length;
  const warningCount = steps.filter(s => s.status === 'warning').length;
  const successCount = steps.filter(s => s.status === 'success').length;
  const loadingCount = steps.filter(s => s.status === 'loading').length;

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        maxWidth: 400,
        maxHeight: '70vh',
        overflow: 'auto',
        zIndex: 1000,
        border: '1px solid',
        borderColor: errorCount > 0 ? 'error.main' : warningCount > 0 ? 'warning.main' : 'divider'
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            시스템 디버그 정보
          </Typography>
          <Button
            size="small"
            onClick={() => setIsVisible(false)}
            startIcon={<VisibilityOffIcon />}
          >
            숨기기
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {errorCount > 0 && <Chip label={`오류 ${errorCount}`} color="error" size="small" />}
          {warningCount > 0 && <Chip label={`경고 ${warningCount}`} color="warning" size="small" />}
          {loadingCount > 0 && <Chip label={`로딩중 ${loadingCount}`} color="primary" size="small" />}
          {successCount > 0 && <Chip label={`성공 ${successCount}`} color="success" size="small" />}
        </Box>
        
        {onClearLogs && (
          <Button size="small" onClick={onClearLogs} sx={{ mb: 1 }}>
            로그 지우기
          </Button>
        )}
      </Box>

      <List dense>
        {steps.map((step, index) => (
          <div key={step.id}>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {statusIcons[step.status]}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {step.name}
                    </Typography>
                    <Chip 
                      label={step.status} 
                      color={statusColors[step.status]} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    {step.message && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {step.message}
                      </Typography>
                    )}
                    {step.timestamp && (
                      <Typography variant="caption" color="text.disabled">
                        {step.timestamp.toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
            
            {step.details && (
              <Box sx={{ px: 2, pb: 1 }}>
                <Accordion
                  expanded={expandedAccordion === step.id}
                  onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? step.id : false)}
                  sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 32 }}>
                    <Typography variant="caption">상세 정보</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <pre style={{ 
                      fontSize: '11px', 
                      overflow: 'auto', 
                      maxHeight: '200px',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {typeof step.details === 'string' 
                        ? step.details 
                        : JSON.stringify(step.details, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {index < steps.length - 1 && <Divider />}
          </div>
        ))}
      </List>
      
      {steps.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            디버그 정보가 없습니다.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}