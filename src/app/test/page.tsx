'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import { useCustomTheme } from '@/contexts/ThemeContext';

export default function TestPage() {
  const { mode, effectiveMode, setMode } = useCustomTheme();

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Typography variant='h2' component='h1' gutterBottom>
        테마 테스트 페이지
      </Typography>

      <Alert severity='success' sx={{ mb: 3 }}>
        ✅ MUI Error #12가 해결되었습니다! 모든 색상이 정상적으로 로드되고
        있습니다.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant='h5' gutterBottom>
            현재 테마 정보
          </Typography>
          <Typography variant='body1' sx={{ mb: 2 }}>
            현재 모드: <Chip label={mode} color='primary' />
          </Typography>
          <Typography variant='body1' sx={{ mb: 2 }}>
            활성 테마: <Chip label={effectiveMode} color='secondary' />
          </Typography>

          <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
            <Button
              variant='contained'
              onClick={() => setMode('light')}
              disabled={mode === 'light'}
            >
              라이트 모드
            </Button>
            <Button
              variant='contained'
              onClick={() => setMode('dark')}
              disabled={mode === 'dark'}
            >
              다크 모드
            </Button>
            <Button
              variant='outlined'
              onClick={() => setMode('system')}
              disabled={mode === 'system'}
            >
              시스템 모드
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 2,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant='h6' color='primary.main'>
              Primary
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'primary.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' color='secondary.main'>
              Secondary
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'secondary.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' color='success.main'>
              Success
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'success.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' color='warning.main'>
              Warning
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'warning.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' color='error.main'>
              Error
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'error.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant='h6' color='info.main'>
              Info
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 60,
                bgcolor: 'info.main',
                borderRadius: 1,
                mt: 1,
              }}
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
