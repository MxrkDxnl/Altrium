export default function NotificationsPanel({
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = null,
  isMarkingAll = false,
  markAllError = null,
  onMarkAllAsRead,
  onNotificationClick,
  onMarkAsRead,
  onViewAll,
  onReload
}) {
  const latestFive = notifications.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col w-full min-w-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-bold text-gray-900 tracking-tight truncate">Recent Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={isMarkingAll}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline disabled:opacity-50 flex-shrink-0 cursor-pointer"
            title="Mark all as read"
          >
            {isMarkingAll ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Error Alert */}
      {markAllError && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2">
          <span className="break-words min-w-0 flex-1">{markAllError}</span>
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="font-bold underline cursor-pointer flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2">
          <span className="break-words min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={onReload}
            className="font-bold underline cursor-pointer flex-shrink-0"
          >
            Reload
          </button>
        </div>
      )}

      {/* Notification List - Grows naturally with zero inner scrollbars */}
      <div className="flex-1 divide-y divide-gray-100 w-full min-w-0">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">
            <div className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Loading updates...</span>
            </div>
          </div>
        ) : latestFive.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="font-semibold text-gray-600">No notifications</p>
            <p className="text-[11px] text-gray-400 mt-0.5">You are up to date.</p>
          </div>
        ) : (
          latestFive.map((notif) => {
            const isUnread = !notif.is_read;
            const dateObj = new Date(notif.createdAt);
            const formattedDate = dateObj.toLocaleDateString();
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={notif.id}
                onClick={() => onNotificationClick(notif)}
                className={`py-3 px-2 -mx-1 rounded-lg cursor-pointer transition-colors ${
                  isUnread ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/80'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 w-full">
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      isUnread ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-transparent'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug break-words text-wrap ${
                        isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-700'
                      }`}
                    >
                      {notif.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">
                        {formattedDate} {formattedTime}
                      </span>
                      {notif.entity_type && (
                        <span className="inline-block px-1 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider bg-gray-100 text-gray-700 whitespace-nowrap">
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
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100 flex-shrink-0 cursor-pointer"
                      title="Mark as read"
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / View All */}
      <div className="pt-3 border-t border-gray-100 mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Showing {Math.min(5, notifications.length)} of {notifications.length}
        </span>
        <button
          type="button"
          onClick={onViewAll}
          className="font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View all</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
