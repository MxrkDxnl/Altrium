import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { useNotifications } from '../context/useNotifications';
import api from '../api';
import WelcomeGreeting from '../components/ui/WelcomeGreeting';
import SummaryCards from '../components/dashboard/SummaryCards';
import ReviewProgressSection from '../components/dashboard/ReviewProgressSection';
import TeamOverviewSection from '../components/dashboard/TeamOverviewSection';
import PipPdpOverviewSection from '../components/dashboard/PipPdpOverviewSection';
import DepartmentReportStatusSection from '../components/dashboard/DepartmentReportStatusSection';
import NeedsAttentionSection from '../components/dashboard/NeedsAttentionSection';
import NotificationsPanel from '../components/dashboard/NotificationsPanel';
import NotificationDrawer from '../components/dashboard/NotificationDrawer';

export default function Home() {
  const { currentUser, welcomeGreeting, clearWelcomeGreeting } = useAuth();
  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    isMarkingAll,
    markAllError,
    markAllAsRead,
    handleNotificationClick,
    markAsRead,
    fetchNotifications,
  } = useNotifications();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchDashboardData = useCallback(() => {
    setReloadKey(k => k + 1);
  }, []);

  useEffect(() => {
    let active = true;
    if (!currentUser?.id) {
      return () => { active = false; };
    }

    api.get('/dashboard')
      .then(res => {
        if (active) {
          setDashboardData(res.data);
          setLoading(false);
          setError(null);
        }
      })
      .catch(err => {
        if (active) {
          console.error('Failed to load dashboard data:', err);
          setError(err.response?.data?.message || 'Failed to load dashboard analytics. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, reloadKey]);

  // Format role label for presentation
  const formatRole = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'operational_manager':
      case 'company_manager':
        return 'Operational Manager';
      case 'department_manager':
      case 'hr_manager':
        return (currentUser?.department === 'Human Resources' || currentUser?.department === 'HR')
          ? 'HR Department Head'
          : 'Department Manager';
      case 'team_manager':
        return 'Team Manager';
      case 'employee':
      default:
        return currentUser?.report_portfolio
          ? `HR Specialist (${currentUser.report_portfolio})`
          : 'Team Member';
    }
  };

  // Dynamic role-tailored subtitle
  const getDashboardSubtitle = (user) => {
    if (user?.role === 'admin') {
      return 'Organization-wide member administration, role appointments, and account access management.';
    }
    if (user?.role === 'operational_manager' || user?.role === 'company_manager') {
      return 'Organization-wide department health, operational performance, and executive governance.';
    }
    if (user?.role === 'department_manager' || user?.role === 'hr_manager') {
      return 'Department review progress, team performance, and quarterly reports.';
    }
    if (user?.role === 'team_manager') {
      return "Your team's review progress, direct reports, and active plans.";
    }
    if (user?.report_portfolio) {
      return `${user.report_portfolio} portfolio oversight, reviews, and development plans.`;
    }
    return 'Your active review tasks, cycle progress, and performance goals.';
  };

  const hasPipPdp = Boolean(dashboardData?.pipPdpOverview);
  const hasDeptReport = Boolean(dashboardData?.departmentReportStatus);
  const bothPlansAndReportsPresent = hasPipPdp && hasDeptReport;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 0. Welcome Greeting Modal / Banner (if set upon login) */}
      {welcomeGreeting && (
        <WelcomeGreeting
          name={welcomeGreeting}
          onDismiss={clearWelcomeGreeting}
        />
      )}

      {/* 1. Dashboard Heading, Welcome Message, Department/Role Context, and Current Review Cycle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, {currentUser?.name}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {formatRole(currentUser?.role)}
            </span>
            {currentUser?.department && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {currentUser.department} {currentUser.team ? `• ${currentUser.team}` : ''}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-700">
            {getDashboardSubtitle(currentUser)}
          </p>
        </div>

        {/* Current Review Cycle Badge */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-xl p-3.5 sm:px-4 flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Current Review Cycle
            </div>
            <div className="text-sm sm:text-base font-bold text-gray-900">
              {dashboardData?.activeCycle?.label || 'Current Cycle'}
            </div>
            <div className="text-xs text-gray-700">
              {dashboardData?.activeCycle?.range || 'Asia/Colombo Standard Cycle'}
            </div>
          </div>
        </div>
      </div>

      {/* Global Analytics Error Alert with Retry */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm w-full">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-bold rounded-lg text-xs transition-colors cursor-pointer flex-shrink-0"
          >
            Retry Loading
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center w-full">
          <div className="inline-flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="text-sm font-semibold text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Four Relevant Summary Cards (Full-Width Row: 4 cols on wide screens, 2 on tablet, 1 on mobile) */}
          <SummaryCards cards={dashboardData?.summaryCards} />

          {/* 3. Review Progress & Recent Notifications (Side by side on wide screens, stacked on narrower screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Review Progress gets the larger share of width */}
            <div className="lg:col-span-7 xl:col-span-8 w-full min-w-0">
              <ReviewProgressSection
                progress={dashboardData?.reviewProgress}
                cycle={dashboardData?.activeCycle}
              />
            </div>

            {/* Recent Notifications gets compact allocation */}
            <div className="lg:col-span-5 xl:col-span-4 w-full min-w-0">
              <NotificationsPanel
                notifications={notifications}
                unreadCount={unreadCount}
                loading={notifLoading}
                error={notifError}
                isMarkingAll={isMarkingAll}
                markAllError={markAllError}
                onMarkAllAsRead={markAllAsRead}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={markAsRead}
                onViewAll={() => setDrawerOpen(true)}
                onReload={fetchNotifications}
              />
            </div>
          </div>

          {/* 4. Team / Direct Reports Overview (Full width row with ample room for columns) */}
          {dashboardData?.teamOverview && (
            <div className="w-full">
              <TeamOverviewSection teamOverview={dashboardData?.teamOverview} />
            </div>
          )}

          {/* 5 & 6. PIP/PDP Overview and Department Report Status (Side by side when both present, full width when only one present) */}
          {(hasPipPdp || hasDeptReport) && (
            <div className={`w-full ${bothPlansAndReportsPresent ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}`}>
              {hasPipPdp && (
                <div className="w-full min-w-0">
                  <PipPdpOverviewSection
                    pipPdpOverview={dashboardData?.pipPdpOverview}
                    userRole={currentUser?.role}
                  />
                </div>
              )}

              {hasDeptReport && (
                <div className="w-full min-w-0">
                  <DepartmentReportStatusSection
                    departmentReportStatus={dashboardData?.departmentReportStatus}
                  />
                </div>
              )}
            </div>
          )}

          {/* 7. Needs Attention — Final section for non-admin/non-executive roles where applicable */}
          {currentUser?.role !== 'admin' && currentUser?.role !== 'operational_manager' && currentUser?.role !== 'company_manager' && (
            <div className="w-full">
              <NeedsAttentionSection items={dashboardData?.needsAttention} />
            </div>
          )}
        </>
      )}

      {/* Accessible View All Notifications Drawer */}
      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        isMarkingAll={isMarkingAll}
      />
    </div>
  );
}
