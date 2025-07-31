'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  Save,
  Upload,
  Delete,
  Business,
  Settings,
  Payment,
  Email,
  Security,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';

interface CompanySettings {
  name: string;
  logo_url?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  bank_info: {
    bank_name?: string;
    account_number?: string;
    account_holder?: string;
    swift_code?: string;
  };
  default_terms: string;
  default_payment_terms: number;
  settings: {
    currency: string;
    date_format: string;
    number_format: string;
    timezone: string;
    auto_backup: boolean;
    email_notifications: boolean;
    quote_expiry_days: number;
    max_file_size_mb: number;
  };
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanySettings>({
    defaultValues: {
      name: '',
      logo_url: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      tax_number: '',
      bank_info: {
        bank_name: '',
        account_number: '',
        account_holder: '',
        swift_code: '',
      },
      default_terms: '',
      default_payment_terms: 30,
      settings: {
        currency: 'KRW',
        date_format: 'YYYY-MM-DD',
        number_format: 'ko-KR',
        timezone: 'Asia/Seoul',
        auto_backup: true,
        email_notifications: true,
        quote_expiry_days: 30,
        max_file_size_mb: 10,
      },
    },
  });

  useEffect(() => {
    if (user?.profile?.role === 'admin') {
      fetchCompanySettings();
    }
  }, [user?.profile?.role]);

  // Check if current user is admin
  if (user?.profile?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>관리자 권한이 필요합니다.</Alert>
      </Box>
    );
  }

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        reset(data);
      } else {
        throw new Error('회사 설정을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      setSnackbar({
        open: true,
        message: '회사 설정을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanySettings) => {
    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      // Upload logo if new file selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const uploadResponse = await fetch('/api/admin/settings/logo', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          logoUrl = uploadData.url;
        } else {
          throw new Error('로고 업로드에 실패했습니다.');
        }
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          logo_url: logoUrl,
        }),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: '설정이 저장되었습니다.',
          severity: 'success',
        });
        fetchCompanySettings(); // Refresh data
        setLogoFile(null);
      } else {
        throw new Error('설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : '설정 저장에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({
          open: true,
          message: '이미지 파일만 업로드 가능합니다.',
          severity: 'error',
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: '파일 크기는 5MB 이하여야 합니다.',
          severity: 'error',
        });
        return;
      }

      setLogoFile(file);
    }
  };

  const currencyOptions = [
    { value: 'KRW', label: '한국 원 (₩)' },
    { value: 'USD', label: '미국 달러 ($)' },
    { value: 'EUR', label: '유로 (€)' },
    { value: 'JPY', label: '일본 엔 (¥)' },
  ];

  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '2024-01-01' },
    { value: 'DD/MM/YYYY', label: '01/01/2024' },
    { value: 'MM/DD/YYYY', label: '01/01/2024' },
    { value: 'DD-MM-YYYY', label: '01-01-2024' },
  ];

  const timezoneOptions = [
    { value: 'Asia/Seoul', label: '서울 (UTC+9)' },
    { value: 'Asia/Tokyo', label: '도쿄 (UTC+9)' },
    { value: 'America/New_York', label: '뉴욕 (UTC-5)' },
    { value: 'Europe/London', label: '런던 (UTC+0)' },
    { value: 'UTC', label: 'UTC (UTC+0)' },
  ];

  if (loading) {
    return <Box sx={{ p: 3 }}>로딩 중...</Box>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant='h4' component='h1'>
          회사 설정
        </Typography>
        <Button
          variant='contained'
          startIcon={<Save />}
          onClick={handleSubmit(onSubmit)}
          disabled={!isDirty || saving}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* 회사 기본 정보 */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<Business />}
                title='회사 기본 정보'
                subheader='회사의 기본 정보를 설정합니다'
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='name'
                      control={control}
                      rules={{ required: '회사명은 필수입니다.' }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='회사명'
                          error={!!errors.name}
                          helperText={errors.name?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='tax_number'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='사업자등록번호'
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        회사 로고
                      </Typography>
                      <Box
                        sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
                      >
                        <Button
                          variant='outlined'
                          component='label'
                          startIcon={<Upload />}
                        >
                          로고 업로드
                          <input
                            type='file'
                            hidden
                            accept='image/*'
                            onChange={handleLogoChange}
                          />
                        </Button>
                        {logoFile && (
                          <Typography variant='body2' color='text.secondary'>
                            {logoFile.name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name='address'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='주소'
                          multiline
                          rows={2}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='phone'
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label='전화번호' />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='email'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='이메일'
                          type='email'
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name='website'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='웹사이트'
                          placeholder='https://example.com'
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 은행 정보 */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<Payment />}
                title='은행 정보'
                subheader='결제 및 정산 관련 은행 정보를 설정합니다'
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='bank_info.bank_name'
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label='은행명' />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='bank_info.account_holder'
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label='예금주' />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='bank_info.account_number'
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} fullWidth label='계좌번호' />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='bank_info.swift_code'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='SWIFT 코드'
                          helperText='국제 송금 시 필요'
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 기본 약관 및 결제 조건 */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<Settings />}
                title='기본 약관 및 조건'
                subheader='견적서에 기본으로 포함될 약관과 조건을 설정합니다'
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Controller
                      name='default_terms'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='기본 약관'
                          multiline
                          rows={4}
                          placeholder='견적서에 기본으로 포함될 약관을 입력하세요...'
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='default_payment_terms'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='기본 결제 기한'
                          type='number'
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position='end'>일</InputAdornment>
                            ),
                          }}
                          helperText='견적서 발행 후 결제 기한 (일)'
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 시스템 설정 */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<Security />}
                title='시스템 설정'
                subheader='시스템 동작과 관련된 설정을 관리합니다'
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='settings.currency'
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>기본 통화</InputLabel>
                          <Select {...field} label='기본 통화'>
                            {currencyOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='settings.timezone'
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>시간대</InputLabel>
                          <Select {...field} label='시간대'>
                            {timezoneOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='settings.date_format'
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth>
                          <InputLabel>날짜 형식</InputLabel>
                          <Select {...field} label='날짜 형식'>
                            {dateFormatOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='settings.quote_expiry_days'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='견적서 유효기간'
                          type='number'
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position='end'>일</InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='settings.max_file_size_mb'
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label='최대 파일 크기'
                          type='number'
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position='end'>MB</InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                    >
                      <Controller
                        name='settings.auto_backup'
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch {...field} checked={field.value} />
                            }
                            label='자동 백업 활성화'
                          />
                        )}
                      />
                      <Controller
                        name='settings.email_notifications'
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch {...field} checked={field.value} />
                            }
                            label='이메일 알림 활성화'
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
