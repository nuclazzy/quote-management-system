'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Pagination,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  FilterList as FilterListIcon,
  Settings as SettingsIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
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

interface NotificationCardProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate: (url?: string) => void
}

function NotificationCard({ notification, onMarkRead, onDelete, onNavigate }: NotificationCardProps) {
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
    <Card
      sx={{
        backgroundColor: is_read ? 'transparent' : 'action.hover',
        borderLeft: `4px solid ${priorityColor}`,
        cursor: link_url ? 'pointer' : 'default'
      }}
      onClick={link_url ? handleClick : undefined}
    >
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Avatar
            sx={{
              backgroundColor: typeColor,
              width: 40,
              height: 40
            }}
          >
            {getNotificationIcon(type)}
          </Avatar>
          
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography
                variant="h6"
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
                  borderColor: typeColor,
                  color: typeColor
                }}
              />
              {!is_read && (
                <Chip
                  label="새 알림"
                  size="small"
                  color="primary"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
            
            <Typography variant="body1" color="text.primary" mb={1}>
              {message}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              {dayjs(created_at).fromNow()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions>
        <Box display="flex" gap={1} ml="auto">
          {!is_read && (
            <Tooltip title="읽음 표시">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(notification.id)
                }}
              >
                <CheckCircleIcon />
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
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  )
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  
  const router = useRouter()
  const itemsPerPage = 10

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetchNotifications
  } = useNotificationContext()

  useEffect(() => {
    // The context automatically fetches notifications
    // We can trigger a refetch when filters change
    refetchNotifications()
  }, [page, filter, showUnreadOnly, refetchNotifications])

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
    }
  }

  const handleNavigateToSettings = () => {
    router.push('/notifications/settings')
  }

  const filteredNotifications = notifications

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          알림 관리
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleNavigateToSettings}
        >
          알림 설정
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {unreadCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                읽지 않은 알림
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.primary">
                {notifications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 알림
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>알림 유형</InputLabel>
            <Select
              value={filter}
              label="알림 유형"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">모든 알림</MenuItem>
              {Object.entries(NotificationTypeLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
              />
            }
            label="읽지 않은 알림만"
          />

          <Box ml="auto" display="flex" gap={1}>
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllRead}
              >
                모두 읽음 표시
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => {
                setPage(1)
                refetchNotifications()
              }}
            >
              새로고침
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Notifications List */}
      {!loading && (
        <>
          {filteredNotifications.length > 0 ? (
            <Box display="flex" flexDirection="column" gap={2}>
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              ))}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon
                sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" mb={1}>
                알림이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {showUnreadOnly
                  ? '읽지 않은 알림이 없습니다.'
                  : '새로운 알림이 있을 때 여기에 표시됩니다.'}
              </Typography>
            </Paper>
          )}

          {/* Pagination */}
          {filteredNotifications.length > 0 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={Math.ceil(notifications.length / itemsPerPage)}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}