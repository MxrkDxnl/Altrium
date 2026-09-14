import { useState, useEffect } from 'react';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  isMarkingAll = false
}) {
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Handle Escape key to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedItems = filteredNotifications.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="notification-drawer-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 id="notification-drawer-title" className="text-base font-bold text-gray-900 leading-tight">
                  All Notifications
                </h2>
                <p className="text-xs text-gray-700">
                  {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Controls: Filter & Mark All as Read */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-white">
            <div className="inline-flex rounded-lg p-1 bg-gray-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilter('unread');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  filter === 'unread' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 underline disabled:opacity-50"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-5 divide-y divide-gray-100">
            {paginatedItems.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                <p className="font-semibold text-gray-700">No notifications found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filter === 'unread' ? 'You have read all notifications.' : 'No notification history available.'}
                </p>
              </div>
            ) : (
              paginatedItems.map((notif) => {
                const isUnread = !notif.is_read;
                const dateObj = new Date(notif.createdAt);
                const formattedDate = dateObj.toLocaleDateString();
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      onNotificationClick(notif);
                      onClose();
                    }}
                    className={`py-3.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
                      isUnread ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        isUnread ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-transparent'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-sm leading-snug break-words ${
                          isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-700'
                        }`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-600 font-medium">
                            {formattedDate} at {formattedTime}
                          </span>
                          {notif.entity_type && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider bg-gray-100 text-gray-700">
                              {notif.entity_type.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notif.id);
                          }}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100/60 flex-shrink-0 cursor-pointer"
                          title="Mark read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/70 flex items-center justify-between text-xs text-gray-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded bg-white border border-gray-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded bg-white border border-gray-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
