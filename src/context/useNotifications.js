import { useContext } from 'react';
import { NotificationContext } from './notificationContextDef';

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
