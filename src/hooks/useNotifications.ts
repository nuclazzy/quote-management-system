import { useState, useEffect, useCallback } from 'react'
import { Notification, NotificationResponse, NotificationSettings } from '@/types/notification'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async (options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.unreadOnly) params.append('unread_only', 'true')
      if (options?.type) params.append('type', options.type)

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data: NotificationResponse = await response.json()
      
      if (options?.offset && options.offset > 0) {
        // Append to existing notifications for pagination
        setNotifications(prev => [...prev, ...data.notifications])
      } else {
        // Replace notifications for fresh fetch
        setNotifications(data.notifications)
      }
      
      setUnreadCount(data.unreadCount)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: notificationIds,
          is_read: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      )

      // Update unread count
      const unreadToMarkCount = notifications.filter(
        n => notificationIds.includes(n.id) && !n.is_read
      ).length
      setUnreadCount(prev => Math.max(0, prev - unreadToMarkCount))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [notifications])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      )
      setUnreadCount(0)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [notifications])

  const createNotification = useCallback(async (notification: {
    title: string
    message: string
    type: string
    link_url?: string
    entity_type?: string
    entity_id?: string
    priority?: string
    user_id?: string
  }) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      const newNotification: Notification = await response.json()
      
      // If it's for the current user, add to local state
      setNotifications(prev => [newNotification, ...prev])
      if (!newNotification.is_read) {
        setUnreadCount(prev => prev + 1)
      }

      return newNotification
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refetch: () => fetchNotifications()
  }
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch notification settings')
      }

      const data: NotificationSettings = await response.json()
      setSettings(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update notification settings')
      }

      const updatedSettings: NotificationSettings = await response.json()
      setSettings(updatedSettings)
      return updatedSettings
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings
  }
}