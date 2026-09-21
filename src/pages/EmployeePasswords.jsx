import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Icon helpers to avoid external package lock issues
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
  </svg>
);

const CopyIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10a2 2 0 00-2 2v3a2 2 0 002 2h10a2 2 0 002-2v-3a2 2 0 00-2-2z" />
  </svg>
);

const KeyIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const DEPARTMENTS = ['IT', 'Finance', 'Human Resources', 'Management'];
const TEAMS_BY_DEPT = {
  IT: ['Software Development', 'Quality Assurance', 'IT Support and Operations', 'Cyber Security', 'UI/UX'],
  Finance: ['Accounting', 'Financial Analysis', 'Finance Operations'],
  'Human Resources': ['HR'],
  Management: ['Executive']
};

const ROLES = [
  { value: 'employee', label: 'Employee / Team Member' },
  { value: 'team_manager', label: 'Team Manager' },
  { value: 'department_manager', label: 'Department Manager' },
  { value: 'hr_manager', label: 'HR Head' },
  { value: 'operational_manager', label: 'Operational Manager' },
  { value: 'admin', label: 'Administrator' }
];

export default function EmployeePasswords() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, activeLogins: 0, neverLoggedIn: 0, totalSessions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [loginStatusFilter, setLoginStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('login_count_desc');

  // Password visibility state (set of member IDs whose password is shown)
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState(null);

  // Reset Password Modal state
  const [resetModalMember, setResetModalMember] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Reload trigger
  const [reloadKey, setReloadKey] = useState(0);

  const refreshAll = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  useEffect(() => {
    let active = true;

    const params = {};
    if (search.trim()) params.search = search.trim();
    if (selectedDept !== 'all') params.department = selectedDept;
    if (selectedTeam !== 'all') params.team = selectedTeam;
    if (selectedRole !== 'all') params.role = selectedRole;
    if (loginStatusFilter !== 'all') params.login_status = loginStatusFilter;
    if (sortBy) params.sort_by = sortBy;

    api.get('/admin/passwords', { params })
      .then((res) => {
        if (active) {
          setMembers(res.data.members || []);
          setStats(res.data.stats || { total: 0, activeLogins: 0, neverLoggedIn: 0, totalSessions: 0 });
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to fetch passwords and access log:', err);
          setError(err.response?.data?.message || 'Failed to load employee access data');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [search, selectedDept, selectedTeam, selectedRole, loginStatusFilter, sortBy, reloadKey]);

  // Toggle single password visibility
  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all passwords
  const toggleAllPasswords = () => {
    if (showAllPasswords) {
      setRevealedIds(new Set());
      setShowAllPasswords(false);
    } else {
      const allIds = new Set(members.map((m) => m.id));
      setRevealedIds(allIds);
      setShowAllPasswords(true);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = (member) => {
    if (!member.plain_password) {
      showNotification(`Password for ${member.name} is hashed and not recorded in plaintext. Reset password to view.`);
      return;
    }
    const pwd = member.plain_password;
    navigator.clipboard.writeText(pwd).then(() => {
      setCopiedId(`pwd-${member.id}`);
      showNotification(`Password for ${member.name} copied to clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Copy full credentials (Email + Password)
  const handleCopyCredentials = (member) => {
    const pwd = member.plain_password || '[Pre-existing password - Reset to view]';
    const text = `Altrium Login Credentials:\nEmail: ${member.email}\nPassword: ${pwd}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(`all-${member.id}`);
      showNotification(`Complete credentials for ${member.name} copied to clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Generate random 12-char password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setResetError('');
  };

  // Open reset password modal
  const handleOpenResetModal = (member) => {
    setResetModalMember(member);
    setNewPassword(member.plain_password || '');
    setResetError('');
  };

  // Submit password reset
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long');
      return;
    }

    setResetSubmitting(true);
    setResetError('');
    try {
      await api.patch(`/admin/members/${resetModalMember.id}/reset-password`, {
        password: newPassword
      });

      showNotification(`Password for ${resetModalMember.name} has been updated to "${newPassword}".`);
      setResetModalMember(null);
      refreshAll();
    } catch (err) {
      console.error('Password reset failed:', err);
      setResetError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Format date helper
  const formatLastLogin = (dateStr) => {
    if (!dateStr) return { text: 'Never Logged In', isNever: true };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { text: 'Never', isNever: true };
      return {
        text: d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isNever: false
      };
    } catch {
      return { text: 'Never', isNever: true };
    }
  };

  // Render role badge
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Administrator</span>;
      case 'operational_manager':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">Ops Manager</span>;
      case 'hr_manager':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">HR Head</span>;
      case 'department_manager':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Dept Manager</span>;
      case 'team_manager':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">Team Manager</span>;
      case 'employee':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Employee</span>;
    }
  };

  const activePercent = stats.total > 0 ? Math.round((stats.activeLogins / stats.total) * 100) : 0;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Toast Banner */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckIcon className="w-5 h-5 text-white flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Employee Passwords & Access Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor employee login frequencies, view and manage active passwords, and identify individuals who have not accessed the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={toggleAllPasswords}
            className="text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {showAllPasswords ? 'Mask All Passwords' : 'Show All Passwords'}
          </Button>
          <Button
            variant="outline"
            onClick={refreshAll}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Refresh Data"
          >
            <RefreshIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Accounts</span>
            <span className="p-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">Roster</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{stats.total}</span>
            <span className="text-xs text-gray-500 font-medium">Registered</span>
          </div>
        </Card>

        <Card className="p-5 border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active System Users</span>
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">{activePercent}%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{stats.activeLogins}</span>
            <span className="text-xs text-gray-500 font-medium">Logged in ≥ 1 time</span>
          </div>
        </Card>

        <Card className="p-5 border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
              Never Logged In
            </span>
            <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full text-xs font-bold">Needs Attention</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">{stats.neverLoggedIn}</span>
            <span className="text-xs text-amber-800 font-medium">0 system logins</span>
          </div>
        </Card>

        <Card className="p-5 border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Logins Recorded</span>
            <span className="p-2 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold">Sessions</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{stats.totalSessions}</span>
            <span className="text-xs text-gray-500 font-medium">Total authentications</span>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-6 border-gray-100 shadow-sm">
        {/* Filters and Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee name or email address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50/50"
              />
            </div>

            {/* Login Activity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Activity:</label>
              <select
                value={loginStatusFilter}
                onChange={(e) => setLoginStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-gray-800"
              >
                <option value="all">All Employees ({stats.total})</option>
                <option value="active">Active Logins ≥ 1 ({stats.activeLogins})</option>
                <option value="never">Never Logged In - 0 Logins ({stats.neverLoggedIn})</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800"
              >
                <option value="login_count_desc">Most Logins (High to Low)</option>
                <option value="login_count_asc">Least Logins (0 first)</option>
                <option value="last_login_desc">Recently Logged In</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedTeam('all');
                }}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                disabled={selectedDept === 'all' && !TEAMS_BY_DEPT[selectedDept]}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="all">All Teams</option>
                {selectedDept !== 'all' && TEAMS_BY_DEPT[selectedDept] && TEAMS_BY_DEPT[selectedDept].map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Table / List View */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <div className="inline-flex items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span className="text-sm font-medium">Loading employee credentials and login history...</span>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <p className="text-base font-semibold text-gray-700">No employees match your filter criteria.</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting the search keyword or filter settings above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Team</th>
                  <th className="py-3 px-4">Current Password</th>
                  <th className="py-3 px-4 text-center">Login Frequency</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {members.map((member) => {
                  const isRevealed = showAllPasswords || revealedIds.has(member.id);
                  const hasPlainPassword = Boolean(member.plain_password);
                  const loginInfo = formatLastLogin(member.last_login_at);
                  const isCopiedPwd = copiedId === `pwd-${member.id}`;
                  const isCopiedAll = copiedId === `all-${member.id}`;
                  const isZeroLogins = Number(member.login_count || 0) === 0;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-amber-50/20 transition-colors ${
                        isZeroLogins ? 'bg-amber-50/10' : ''
                      }`}
                    >
                      {/* Employee Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-amber-200">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderRoleBadge(member.role)}
                      </td>

                      {/* Department & Team */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-gray-900">{member.department || '—'}</div>
                        <div className="text-xs text-gray-500">{member.team || '—'}</div>
                      </td>

                      {/* Current Password Field */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                          {hasPlainPassword ? (
                            <>
                              <span className="font-mono text-xs font-semibold text-gray-800 select-all tracking-wide">
                                {isRevealed ? member.plain_password : '••••••••••••'}
                              </span>
                              
                              {/* Toggle visibility */}
                              <button
                                type="button"
                                onClick={() => toggleReveal(member.id)}
                                className="text-gray-400 hover:text-gray-700 focus:outline-none p-1"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? (
                                  <EyeOffIcon className="w-4 h-4" />
                                ) : (
                                  <EyeIcon className="w-4 h-4" />
                                )}
                              </button>

                              {/* Quick Copy Password */}
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(member)}
                                className="text-gray-400 hover:text-amber-600 focus:outline-none p-1"
                                title="Copy Password"
                              >
                                {isCopiedPwd ? (
                                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <CopyIcon className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic font-medium" title="Account was created before plaintext password tracking was introduced. Use Reset Password to set a known password.">
                              Hashed (Not recorded)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Login Frequency Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isZeroLogins ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-700" />
                            0 Logins (Never)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            {member.login_count} {member.login_count === 1 ? 'Login' : 'Logins'}
                          </span>
                        )}
                      </td>

                      {/* Last Login Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-xs ${loginInfo.isNever ? 'text-amber-700 font-semibold' : 'text-gray-600 font-medium'}`}>
                          {loginInfo.text}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(member)}
                            className="p-1.5 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-md border border-gray-200"
                            title="Copy Email & Password to send to employee"
                          >
                            {isCopiedAll ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckIcon className="w-3.5 h-3.5" /> Copied!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-medium">
                                <CopyIcon className="w-3.5 h-3.5" /> Copy
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-amber-500 text-black hover:bg-amber-400 shadow-sm"
                          >
                            <KeyIcon className="w-3.5 h-3.5" />
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reset Password Modal */}
      {resetModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                <KeyIcon className="w-5 h-5 text-amber-500" />
                Reset Employee Password
              </div>
              <button
                type="button"
                onClick={() => setResetModalMember(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 bg-amber-50/60 p-3 rounded-lg border border-amber-200/60 text-xs text-amber-900">
              <p className="font-semibold text-amber-950">Target Account:</p>
              <p className="text-gray-900 font-bold mt-0.5">{resetModalMember.name}</p>
              <p className="text-gray-600">{resetModalMember.email}</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Password (min. 8 characters)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 pr-24"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded font-medium"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalMember(null)}
                  disabled={resetSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  className="bg-amber-500 text-black hover:bg-amber-400 font-bold"
                >
                  {resetSubmitting ? 'Updating...' : 'Save & Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
