import { getUploadUrl } from '../../api';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/useAuth';
import { useNotifications } from '../../context/useNotifications';
import { useNavigate } from 'react-router-dom';
import AltriumLogo from '../ui/AltriumLogo';

export default function TopNavbar({ mobileMenuOpen, onToggleMobileMenu }) {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, handleNotificationClick, markAllAsRead, isMarkingAll } = useNotifications();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="h-16 flex items-center justify-between px-3 sm:px-6 z-40 w-full">
      {/* Left Area: Hamburger button on mobile + Logo */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-shrink">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="md:hidden p-1.5 -ml-1 rounded-md text-gray-700 hover:text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 flex-shrink-0"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={onToggleMobileMenu}
        >
          <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          <AltriumLogo className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
          <span className="text-lg sm:text-2xl font-bold text-black tracking-tight truncate">altrium</span>
          <span className="hidden sm:inline text-gray-600 text-sm ml-2 font-medium whitespace-nowrap">Performance Tracker</span>
        </div>
      </div>

      {/* Right side Profile & Notifications */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        
        <div className="relative" ref={dropdownRef}>
          <button 
            type="button"
            className="cursor-pointer relative p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={showDropdown}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50 max-h-96 overflow-y-auto">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <span className="font-semibold text-gray-700 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }}
                    disabled={isMarkingAll}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isMarkingAll ? 'Marking...' : 'Mark all read'}
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    onClick={() => {
                      handleNotificationClick(notification);
                      setShowDropdown(false);
                    }}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start">
                      {!notification.is_read && (
                        <div className="mt-1.5 mr-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      )}
                      <div>
                        <p className={`text-sm ${!notification.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center space-x-1.5 sm:space-x-2 border border-gray-200 rounded-full py-1 px-2 sm:px-2.5 bg-white shadow-sm cursor-pointer hover:shadow-md transition"
        >
          <span className="text-xs sm:text-sm font-medium text-gray-700 max-w-[65px] sm:max-w-[120px] md:max-w-none truncate">{currentUser?.name || 'User'}</span>
          {currentUser?.profile_picture ? (
            <img 
              src={getUploadUrl(currentUser.profile_picture)} 
              alt={currentUser.name} 
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#E7F0F8] text-[#1A2F45] flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>

        <button 
          type="button"
          onClick={logout}
          className="text-xs sm:text-sm font-semibold text-red-700 hover:text-red-900 transition cursor-pointer px-1"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
