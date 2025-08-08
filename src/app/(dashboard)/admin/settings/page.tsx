'use client';

import { useState, useEffect } from 'react';
import PermissionGuard from '@/components/common/PermissionGuard';
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
  default_terms: string;
  default_payment_terms: number;
}

export default function AdminSettingsPage() {
  const { user, isAdmin } = useAuth();
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
      default_terms: '',
      default_payment_terms: 30,
    },
  });

  useEffect(() => {
    // StaticAuthContext에서는 isAdmin을 직접 체크
    if (isAdmin) {
      fetchCompanySettings();
    }
  }, [isAdmin]);
  
  // Check if current user is admin
  if (!isAdmin) {
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


  if (loading) {
    return <Box sx={{ p: 3 }}>로딩 중...</Box>;
  }

  return (
    <PermissionGuard requireMinimumRole="admin">
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
    </PermissionGuard>
  );
}
