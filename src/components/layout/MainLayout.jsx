import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import AltriumLogo from '../ui/AltriumLogo';
import RouteErrorBoundary from '../common/RouteErrorBoundary';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Focus close button when drawer opens for accessibility
  useEffect(() => {
    if (mobileMenuOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden w-full">
      {/* Desktop Sidebar - Fixed width */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-[#17191C] text-white">
        <Sidebar />
      </aside>

      {/* Mobile Drawer Backdrop & Modal (< md) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 md:hidden bg-black/60 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <div 
            className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#17191C] text-white shadow-xl flex flex-col z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <AltriumLogo className="w-7 h-7" />
                <span className="text-xl font-bold text-white tracking-tight">altrium</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 flex-shrink-0">
          <TopNavbar 
            mobileMenuOpen={mobileMenuOpen} 
            onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} 
          />
        </header>

        {/* Scrollable Page Content with Route Error Containment */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-full">
          <RouteErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
