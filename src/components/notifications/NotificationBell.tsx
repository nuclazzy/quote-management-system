'use client'

import { useState } from 'react'
import {
  IconButton,
  Badge,
  Popover,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Button,
  Chip,
  Avatar,
  Tooltip,
  CircularProgress
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
  Settings as SettingsIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ko'

dayjs.extend(relativeTime)
dayjs.locale('ko')
import { useRouter } from 'next/navigation'
import { useNotificationContext } from '@/contexts/NotificationContext'
import {
  Notification,
  NotificationType,
  NotificationTypeColors,
  NotificationPriorityColors,
  NotificationTypeLabels
} from '@/types/notification'

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'quote_created':
    case 'quote_approved':
    case 'quote_rejected':
    case 'quote_expiring':
      return <DescriptionIcon />
    case 'project_created':
    case 'project_status_changed':
    case 'project_deadline_approaching':
      return <BusinessIcon />
    case 'settlement_due':
    case 'settlement_completed':
    case 'settlement_overdue':
      return <AccountBalanceIcon />
    case 'system_user_joined':
    case 'system_permission_changed':
      return <PersonIcon />
    default:
      return <NotificationsIcon />
  }
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (url?: string) => void
}

function NotificationItem({ notification, onMarkRead, onDelete, onNavigate }: NotificationItemProps) {
  const { title, message, type, link_url, is_read, priority, created_at } = notification

  const handleClick = () => {
    if (!is_read) {
      onMarkRead(notification.id)
    }
    if (link_url) {
      onNavigate(link_url)
    }
  }

  const priorityColor = NotificationPriorityColors[priority]
  const typeColor = NotificationTypeColors[type]

  return (
    <ListItem
      disablePadding
      sx={{
        backgroundColor: is_read ? 'transparent' : 'action.hover',
        borderLeft: `4px solid ${priorityColor}`,
      }}
    >
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <Avatar
            sx={{
              backgroundColor: typeColor,
              width: 32,
              height: 32
            }}
          >
            {getNotificationIcon(type)}
          </Avatar>
        </ListItemIcon>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: is_read ? 'normal' : 'bold',
                  flex: 1
                }}
              >
                {title}
              </Typography>
              <Chip
                label={NotificationTypeLabels[type]}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  borderColor: typeColor,
                  color: typeColor
                }}
              />
            </Box>
          }
          secondary={
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 0.5
                }}
              >
                {message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(created_at).fromNow()}
              </Typography>
            </Box>
          }
        />
        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
          {!is_read && (
            <Tooltip title="읽음 표시">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(notification.id)
                }}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="삭제">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(notification.id)
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!is_read && (
            <CircleIcon
              sx={{
                fontSize: 8,
                color: 'primary.main'
              }}
            />
          )}
        </Box>
      </ListItemButton>
    </ListItem>
  )
}

export function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const router = useRouter()
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationContext()

  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead([id])
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNavigate = (url?: string) => {
    if (url) {
      router.push(url)
      handleClose()
    }
  }

  const handleViewAll = () => {
    router.push('/notifications')
    handleClose()
  }

  const displayNotifications = notifications.slice(0, 10) // Show only first 10

  return (
    <>
      <Tooltip title="알림">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label="알림"
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1
          }
        }}
      >
        <Paper>
          <Box p={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">
                알림 {unreadCount > 0 && `(${unreadCount})`}
              </Typography>
              {unreadCount > 0 && (
                <Tooltip title="모두 읽음 표시">
                  <IconButton size="small" onClick={handleMarkAllRead}>
                    <DoneAllIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            
            {loading && (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>

          <Divider />

          {displayNotifications.length > 0 ? (
            <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
              {displayNotifications.map((notification, index) => (
                <Box key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                  {index < displayNotifications.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          ) : (
            <Box p={3} textAlign="center">
              <NotificationsIcon
                sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                새로운 알림이 없습니다
              </Typography>
            </Box>
          )}

          <Divider />
          
          <Box p={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleViewAll}
              startIcon={<NotificationsIcon />}
            >
              모든 알림 보기
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  )
}