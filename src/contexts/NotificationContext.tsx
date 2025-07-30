'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  Notification as AppNotification,
  NotificationResponse,
} from '@/types/notification';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refetchNotifications: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data: NotificationResponse = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: notificationIds,
          is_read: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Update unread count
      const unreadToMarkCount = notifications.filter(
        (n) => notificationIds.includes(n.id) && !n.is_read
      ).length;
      setUnreadCount((prev) => Math.max(0, prev - unreadToMarkCount));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  };

  const addNotification = (notification: AppNotification) => {
    setNotifications((prev) => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const refetchNotifications = async () => {
    await fetchNotifications();
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Browser notification permission request
  useEffect(() => {
    if (
      user &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      // Optionally request browser notification permission
      // Notification.requestPermission()
    }
  }, [user]);

  // Listen for new notifications (if using Server-Sent Events or WebSockets in the future)
  useEffect(() => {
    if (!user) return;

    // Placeholder for real-time notification listener
    // This could be implemented with Server-Sent Events or WebSockets
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh notifications when user returns to the tab
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetchNotifications,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

// Alias for backward compatibility
export const useNotification = useNotificationContext;

// Browser notification utility
export function showBrowserNotification(
  title: string,
  message: string,
  icon?: string
) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: icon || '/favicon.ico',
      tag: 'quote-system-notification',
    });
  }
}
