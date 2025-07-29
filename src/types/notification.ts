export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link_url?: string
  is_read: boolean
  entity_type?: string
  entity_id?: string
  priority: NotificationPriority
  created_at: string
}

export type NotificationType =
  | 'quote_created'
  | 'quote_approved'
  | 'quote_rejected'
  | 'quote_expiring'
  | 'project_created'
  | 'project_status_changed'
  | 'project_deadline_approaching'
  | 'settlement_due'
  | 'settlement_completed'
  | 'settlement_overdue'
  | 'system_user_joined'
  | 'system_permission_changed'
  | 'general'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationSettings {
  id: string
  user_id: string
  quote_created: boolean
  quote_approved: boolean
  quote_rejected: boolean
  quote_expiring: boolean
  project_created: boolean
  project_status_changed: boolean
  project_deadline_approaching: boolean
  settlement_due: boolean
  settlement_completed: boolean
  settlement_overdue: boolean
  system_user_joined: boolean
  system_permission_changed: boolean
  email_notifications: boolean
  browser_notifications: boolean
  created_at: string
  updated_at: string
}

export interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
  hasMore: boolean
}

export const NotificationTypeLabels: Record<NotificationType, string> = {
  quote_created: '견적서 생성',
  quote_approved: '견적서 승인',
  quote_rejected: '견적서 거절',
  quote_expiring: '견적서 만료 임박',
  project_created: '프로젝트 생성',
  project_status_changed: '프로젝트 상태 변경',
  project_deadline_approaching: '프로젝트 마감일 임박',
  settlement_due: '정산일 임박',
  settlement_completed: '정산 완료',
  settlement_overdue: '정산 연체',
  system_user_joined: '사용자 가입',
  system_permission_changed: '권한 변경',
  general: '일반 알림'
}

export const NotificationTypeColors: Record<NotificationType, string> = {
  quote_created: '#2196F3',
  quote_approved: '#4CAF50',
  quote_rejected: '#F44336',
  quote_expiring: '#FF9800',
  project_created: '#9C27B0',
  project_status_changed: '#3F51B5',
  project_deadline_approaching: '#FF5722',
  settlement_due: '#FFC107',
  settlement_completed: '#4CAF50',
  settlement_overdue: '#F44336',
  system_user_joined: '#00BCD4',
  system_permission_changed: '#795548',
  general: '#607D8B'
}

export const NotificationPriorityColors: Record<NotificationPriority, string> = {
  low: '#9E9E9E',
  normal: '#2196F3',
  high: '#FF9800',
  urgent: '#F44336'
}