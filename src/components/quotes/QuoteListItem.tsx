'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import QuoteStatusChip, { QuoteStatus } from './QuoteStatusChip';
import { formatCurrency, formatDate } from '@/utils/format';

interface QuoteListItemProps {
  quote: {
    id: string;
    project_title: string;
    customer_name_snapshot: string;
    total_amount: number;
    status: QuoteStatus;
    issue_date: string;
    created_at: string;
    created_by_name?: string;
  };
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export default function QuoteListItem({
  quote,
  onView,
  onEdit,
  onCopy,
  onDelete,
  onSend,
  onDownload,
}: QuoteListItemProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: () => void) => {
    handleMenuClose();
    action();
  };

  const handleCardClick = () => {
    onView?.(quote.id);
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) => theme.shadows[4],
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant='h6'
              component='h3'
              noWrap
              sx={{ mb: 1, fontWeight: 600 }}
            >
              {quote.project_title}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant='body2' color='textSecondary'>
                {quote.customer_name_snapshot}
              </Typography>
              <QuoteStatusChip status={quote.status} />
            </Box>

            <Typography
              variant='h6'
              color='primary'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {formatCurrency(quote.total_amount)}
            </Typography>
          </Box>

          <IconButton
            aria-label='더 보기'
            onClick={handleMenuOpen}
            size='small'
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='caption' color='textSecondary'>
              발행일: {formatDate(quote.issue_date)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {quote.created_by_name && (
              <Tooltip title={`작성자: ${quote.created_by_name}`}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                  {quote.created_by_name[0]}
                </Avatar>
              </Tooltip>
            )}
            <Typography variant='caption' color='textSecondary'>
              {formatDate(quote.created_at)}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onView && (
          <MenuItem onClick={() => handleAction(() => onView(quote.id))}>
            <ListItemIcon>
              <ViewIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>보기</ListItemText>
          </MenuItem>
        )}

        {onEdit && (
          <MenuItem onClick={() => handleAction(() => onEdit(quote.id))}>
            <ListItemIcon>
              <EditIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>수정</ListItemText>
          </MenuItem>
        )}

        {onCopy && (
          <MenuItem onClick={() => handleAction(() => onCopy(quote.id))}>
            <ListItemIcon>
              <CopyIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>복사</ListItemText>
          </MenuItem>
        )}

        {onSend && quote.status === 'draft' && (
          <MenuItem onClick={() => handleAction(() => onSend(quote.id))}>
            <ListItemIcon>
              <SendIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>발송</ListItemText>
          </MenuItem>
        )}

        {onDownload && (
          <MenuItem onClick={() => handleAction(() => onDownload(quote.id))}>
            <ListItemIcon>
              <DownloadIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>다운로드</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {onDelete && (
          <MenuItem
            onClick={() => handleAction(() => onDelete(quote.id))}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize='small' color='error' />
            </ListItemIcon>
            <ListItemText>삭제</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}
