'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Web as WebIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useNotificationSettings } from '@/hooks/useNotifications';
import { NotificationSettings } from '@/types/notification';

interface SettingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: {
    key: keyof NotificationSettings;
    label: string;
    description?: string;
  }[];
  values: NotificationSettings | null;
  onChange: (key: keyof NotificationSettings, value: boolean) => void;
}

function SettingCard({
  title,
  description,
  icon,
  settings,
  values,
  onChange,
}: SettingCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display='flex' alignItems='center' gap={2} mb={2}>
          {icon}
          <Box>
            <Typography variant='h6'>{title}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {description}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box display='flex' flexDirection='column' gap={1}>
          {settings.map((setting) => (
            <FormControlLabel
              key={setting.key}
              control={
                <Switch
                  checked={(values?.[setting.key] as boolean) ?? true}
                  onChange={(e) => onChange(setting.key, e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant='body2'>{setting.label}</Typography>
                  {setting.description && (
                    <Typography variant='caption' color='text.secondary'>
                      {setting.description}
                    </Typography>
                  )}
                </Box>
              }
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { settings, loading, error, updateSettings } =
    useNotificationSettings();

  const [localSettings, setLocalSettings] =
    useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize local settings when settings are loaded
  if (settings && !localSettings) {
    setLocalSettings({ ...settings });
  }

  const handleSettingChange = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    if (localSettings) {
      setLocalSettings({
        ...localSettings,
        [key]: value,
      });
    }
  };

  const handleSave = async () => {
    if (!localSettings) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      await updateSettings(localSettings);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  };

  const hasChanges =
    localSettings &&
    settings &&
    JSON.stringify(localSettings) !== JSON.stringify(settings);

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='400px'
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4' component='h1'>
          알림 설정
        </Typography>
        <Button variant='outlined' onClick={() => router.back()}>
          뒤로 가기
        </Button>
      </Box>

      <Typography variant='body1' color='text.secondary' mb={4}>
        받고 싶은 알림을 설정하세요. 각 카테고리별로 세부적인 알림을 관리할 수
        있습니다.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {saveSuccess && (
        <Alert severity='success' sx={{ mb: 3 }}>
          알림 설정이 성공적으로 저장되었습니다.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quote Notifications */}
        <Grid item xs={12} md={6}>
          <SettingCard
            title='견적서 알림'
            description='견적서 관련 활동에 대한 알림'
            icon={<DescriptionIcon color='primary' />}
            settings={[
              {
                key: 'quote_created',
                label: '견적서 생성',
                description: '새 견적서가 생성될 때',
              },
              {
                key: 'quote_approved',
                label: '견적서 승인',
                description: '견적서가 승인될 때',
              },
              {
                key: 'quote_rejected',
                label: '견적서 거절',
                description: '견적서가 거절될 때',
              },
              {
                key: 'quote_expiring',
                label: '견적서 만료 임박',
                description: '견적서 유효기간이 임박할 때',
              },
            ]}
            values={localSettings}
            onChange={handleSettingChange}
          />
        </Grid>

        {/* Project Notifications */}
        <Grid item xs={12} md={6}>
          <SettingCard
            title='프로젝트 알림'
            description='프로젝트 관련 활동에 대한 알림'
            icon={<BusinessIcon color='primary' />}
            settings={[
              {
                key: 'project_created',
                label: '프로젝트 생성',
                description: '새 프로젝트가 생성될 때',
              },
              {
                key: 'project_status_changed',
                label: '프로젝트 상태 변경',
                description: '프로젝트 상태가 변경될 때',
              },
              {
                key: 'project_deadline_approaching',
                label: '프로젝트 마감일 임박',
                description: '프로젝트 마감일이 임박할 때',
              },
            ]}
            values={localSettings}
            onChange={handleSettingChange}
          />
        </Grid>

        {/* Settlement Notifications */}
        <Grid item xs={12} md={6}>
          <SettingCard
            title='정산 알림'
            description='정산 관련 활동에 대한 알림'
            icon={<AccountBalanceIcon color='primary' />}
            settings={[
              {
                key: 'settlement_due',
                label: '정산일 임박',
                description: '정산 예정일이 임박할 때',
              },
              {
                key: 'settlement_completed',
                label: '정산 완료',
                description: '정산이 완료될 때',
              },
              {
                key: 'settlement_overdue',
                label: '정산 연체',
                description: '정산이 연체될 때',
              },
            ]}
            values={localSettings}
            onChange={handleSettingChange}
          />
        </Grid>

        {/* System Notifications */}
        <Grid item xs={12} md={6}>
          <SettingCard
            title='시스템 알림'
            description='시스템 관련 활동에 대한 알림'
            icon={<PersonIcon color='primary' />}
            settings={[
              {
                key: 'system_user_joined',
                label: '사용자 가입',
                description: '새 사용자가 가입할 때',
              },
              {
                key: 'system_permission_changed',
                label: '권한 변경',
                description: '사용자 권한이 변경될 때',
              },
            ]}
            values={localSettings}
            onChange={handleSettingChange}
          />
        </Grid>

        {/* Delivery Method Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center' gap={2} mb={2}>
                <NotificationsIcon color='primary' />
                <Box>
                  <Typography variant='h6'>알림 수신 방법</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    알림을 받을 방법을 선택하세요
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings?.email_notifications ?? true}
                        onChange={(e) =>
                          handleSettingChange(
                            'email_notifications',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label={
                      <Box display='flex' alignItems='center' gap={1}>
                        <EmailIcon fontSize='small' />
                        <Box>
                          <Typography variant='body2'>이메일 알림</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            등록된 이메일로 알림 발송
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings?.browser_notifications ?? false}
                        onChange={(e) =>
                          handleSettingChange(
                            'browser_notifications',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label={
                      <Box display='flex' alignItems='center' gap={1}>
                        <WebIcon fontSize='small' />
                        <Box>
                          <Typography variant='body2'>브라우저 알림</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            브라우저 푸시 알림 (베타)
                          </Typography>
                        </Box>
                        <Chip
                          label='Beta'
                          size='small'
                          variant='outlined'
                          color='primary'
                        />
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Actions */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='body2' color='text.secondary'>
            {hasChanges
              ? '변경 사항이 있습니다.'
              : '모든 설정이 저장되었습니다.'}
          </Typography>

          <Box display='flex' gap={2}>
            <Button
              variant='outlined'
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              초기화
            </Button>
            <Button
              variant='contained'
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
