import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { NotificationContext } from './notificationContextDef';
import api from '../api';

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markAllError, setMarkAllError] = useState(null);

  const activeUserIdRef = useRef(currentUser?.id);

  useEffect(() => {
    activeUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  // Fetch all notifications from server
  const fetchNotifications = useCallback(async (options = { silent: false }) => {
    if (!activeUserIdRef.current) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (!options.silent) {
      setError(null);
    }

    try {
      const res = await api.get('/notifications');
      if (activeUserIdRef.current) {
        setNotifications(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      if (!options.silent) {
        setError('Failed to load notifications');
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, []);

  // Poll notifications periodically and on window focus
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!currentUser?.id) {
        if (isMounted) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.get('/notifications');
        if (isMounted) {
          setNotifications(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load notifications');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    const interval = setInterval(() => {
      fetchNotifications({ silent: true });
    }, 10000);

    const handleFocus = () => {
      fetchNotifications({ silent: true });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.id, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    // Optimistic local update
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    try {
      await api.put(`/notifications/${notificationId}/read`);
    } catch (err) {
      console.error(`Failed to mark notification ${notificationId} as read:`, err);
      // Re-fetch to synchronize with server state
      fetchNotifications({ silent: true });
    }
  }, [fetchNotifications]);

  // Mark all unread notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadItems = notifications.filter(n => !n.is_read);
    if (unreadItems.length === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);
    setMarkAllError(null);

    // Capture precise cutoff time
    const cutoffTime = new Date().toISOString();
    const previousNotifications = [...notifications];

    // Optimistic update: mark all items created at or before cutoff as read
    setNotifications(prev =>
      prev.map(n => {
        if (!n.is_read && new Date(n.createdAt) <= new Date(cutoffTime)) {
          return { ...n, is_read: true };
        }
        return n;
      })
    );

    try {
      await api.put('/notifications/mark-all-read', { before: cutoffTime });
      // Fetch latest silent snapshot to ensure full consistency
      await fetchNotifications({ silent: true });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // Rollback to previous state on failure
      setNotifications(previousNotifications);
      setMarkAllError('Failed to mark all notifications as read. Please try again.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [notifications, isMarkingAll, fetchNotifications]);

  // Navigate to target path and mark notification read
  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification) return;

    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    let targetPath;

    if (notification.link) {
      targetPath = notification.link;
    } else {
      const msg = notification.message || '';
      if (
        msg.includes('Self Review') ||
        msg.includes('peer review') ||
        msg.includes('upward feedback') ||
        msg.includes('assigned a PIP') ||
        msg.includes('assigned a PDP') ||
        msg.includes('feedback on your evidence deliverable') ||
        msg.includes('has been concluded and marked completed') ||
        msg.includes('assigned reviews')
      ) {
        targetPath = '/my-tasks';
      } else if (msg.includes('Department Summary Report') || msg.includes('department report') || msg.includes('Revision')) {
        targetPath = '/department-reports';
      } else if (msg.includes('has submitted evidence for')) {
        targetPath = '/assign-plan';
      } else if (msg.includes('submitted their assigned review')) {
        if (currentUser?.role === 'team_manager' || currentUser?.role === 'department_manager') {
          targetPath = '/review-table';
        } else {
          targetPath = '/';
        }
      } else {
        targetPath = currentUser?.role === 'employee' ? '/my-tasks' : '/';
      }
    }

    navigate(targetPath);
  }, [currentUser?.role, markAsRead, navigate]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    isMarkingAll,
    markAllError,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
