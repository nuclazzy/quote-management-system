'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useStaticAuth } from '@/contexts/StaticAuthContext';

interface AdminLoginProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminLogin({ open, onClose, onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { adminLogin } = useStaticAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (adminLogin(password)) {
      setPassword('');
      setError('');
      onSuccess?.();
      onClose();
    } else {
      setError('비밀번호가 틀렸습니다.');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        관리자 로그인
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <TextField
            fullWidth
            type="password"
            label="관리자 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="admin123"
            autoFocus
            helperText="힌트: admin123"
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>
            취소
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!password.trim()}
          >
            로그인
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}