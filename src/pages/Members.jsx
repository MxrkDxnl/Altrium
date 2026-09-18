import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// Icon helpers to avoid dependency locks
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserPlusIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ShieldCheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockClosedIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

export default function Members() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'IT',
    team: 'Software Development',
    report_portfolio: '',
    quarter_batch: 'Q1',
    manager_id: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Status toggle confirmation
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const refreshAll = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const params = {};
    if (search.trim()) params.search = search.trim();
    if (selectedDept !== 'all') params.department = selectedDept;
    if (selectedTeam !== 'all') params.team = selectedTeam;
    if (selectedRole !== 'all') params.role = selectedRole;
    if (selectedStatus !== 'all') params.status = selectedStatus;

    api.get('/admin/members', { params })
      .then((res) => {
        if (active) {
          setMembers(res.data.members || []);
          setStats(res.data.stats || { total: 0, active: 0, inactive: 0 });
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to fetch members:', err);
          setError(err.response?.data?.message || 'Failed to load member list');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [search, selectedDept, selectedTeam, selectedRole, selectedStatus, reloadKey]);

  useEffect(() => {
    let active = true;
    api.get('/admin/reporting-managers')
      .then((res) => {
        if (active) setManagers(res.data || []);
      })
      .catch((err) => {
        if (active) console.error('Failed to fetch reporting managers:', err);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: 'IT',
      team: 'Software Development',
      report_portfolio: '',
      quarter_batch: 'Q1',
      manager_id: ''
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      password: '',
      role: member.role || 'employee',
      department: member.department || '',
      team: member.team || '',
      report_portfolio: member.report_portfolio || '',
      quarter_batch: member.quarter_batch || 'Q1',
      manager_id: member.manager_id ? String(member.manager_id) : ''
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Handle Add Member submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    if (!formData.password || formData.password.length < 12) {
      errors.password = 'Temporary password must be at least 12 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        department: formData.department || null,
        team: formData.team || null,
        report_portfolio: formData.report_portfolio || null,
        quarter_batch: formData.quarter_batch || null,
        manager_id: formData.manager_id ? parseInt(formData.manager_id, 10) : null
      };

      await api.post('/admin/members', payload);
      setIsAddModalOpen(false);
      showNotification(`Member "${formData.name}" added successfully.`);
      refreshAll();
    } catch (err) {
      console.error('Failed to add member:', err);
      setFormErrors({ submit: err.response?.data?.message || 'Failed to create member' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Member submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    if (formData.password && formData.password.length < 12) {
      errors.password = 'Reset password must be at least 12 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        department: formData.department || null,
        team: formData.team || null,
        report_portfolio: formData.report_portfolio || null,
        quarter_batch: formData.quarter_batch || null,
        manager_id: formData.manager_id ? parseInt(formData.manager_id, 10) : null
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await api.patch(`/admin/members/${selectedMember.id}`, payload);
      setIsEditModalOpen(false);
      showNotification(`Member "${formData.name}" updated successfully.`);
      refreshAll();
    } catch (err) {
      console.error('Failed to update member:', err);
      setFormErrors({ submit: err.response?.data?.message || 'Failed to update member' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Soft Deactivate / Restore status toggle
  const handleStatusToggle = async () => {
    if (!statusConfirmUser) return;
    setStatusSubmitting(true);
    try {
      const res = await api.patch(`/admin/members/${statusConfirmUser.id}/status`, {
        is_active: !statusConfirmUser.is_active
      });
      showNotification(res.data.message || 'Status updated successfully.');
      setStatusConfirmUser(null);
      refreshAll();
    } catch (err) {
      console.error('Status update failed:', err);
      alert(err.response?.data?.message || 'Failed to update member status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Role Badge Formatter
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Administrator</span>;
      case 'operational_manager':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">Operational Manager</span>;
      case 'department_manager':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">Department Head</span>;
      case 'team_manager':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">Team Manager</span>;
      case 'hr_manager':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-900 border border-pink-200">HR Head</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Team Member</span>;
    }
  };

  // Dynamic available teams based on selected department in forms
  const availableTeams = useMemo(() => {
    if (!formData.department) return [];
    return TEAMS_BY_DEPT[formData.department] || [];
  }, [formData.department]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Member Management
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              Administrator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600">
            Manage organization directory, appoint operational, department, and team managers, and administer member account access.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold px-5 py-2.5 rounded-xl shadow-sm self-start md:self-auto cursor-pointer"
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>Add New Member</span>
        </Button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-sm animate-fade-in">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* 2. Statistical Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 border-gray-200 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Accounts</div>
          <div className="text-3xl font-extrabold text-gray-900 mt-1">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Preserved organization users</div>
        </Card>

        <Card className="p-4 sm:p-5 border-gray-200 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Active Members</div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-1">{stats.active}</div>
          <div className="text-xs text-gray-500 mt-1">Granted system access</div>
        </Card>

        <Card className="p-4 sm:p-5 border-gray-200 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Deactivated Accounts</div>
          <div className="text-3xl font-extrabold text-gray-700 mt-1">{stats.inactive}</div>
          <div className="text-xs text-gray-500 mt-1">History & reviews preserved</div>
        </Card>

        <Card className="p-4 sm:p-5 border-gray-200 bg-white">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Departments</div>
          <div className="text-3xl font-extrabold text-amber-700 mt-1">3</div>
          <div className="text-xs text-gray-500 mt-1">IT • Finance • Human Resources</div>
        </Card>
      </div>

      {/* 3. Search & Multi-criteria Filtering Toolbar */}
      <Card className="p-4 sm:p-5 border-gray-200 bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="lg:col-span-1 relative">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search name / email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedTeam('all');
              }}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="all">All Teams</option>
              {Object.entries(TEAMS_BY_DEPT)
                .filter(([dept]) => selectedDept === 'all' || dept === selectedDept)
                .flatMap(([, teams]) => teams)
                .map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 4. Members Table */}
      <Card className="border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-sm text-gray-500 font-medium mt-3">Loading organization members...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">
            <p className="font-semibold">{error}</p>
            <Button onClick={refreshAll} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-base font-semibold">No members match the selected filters.</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing search terms or department filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Department & Team</th>
                  <th className="px-4 py-3.5">Reports To</th>
                  <th className="px-3 py-3.5 text-center">Batch</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {members.map((member) => {
                  const initial = member.name ? member.name.charAt(0).toUpperCase() : 'U';
                  const employeeId = `ALT-${String(member.id).padStart(4, '0')}`;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-amber-50/40 transition-colors ${!member.is_active ? 'bg-gray-50/80 opacity-75' : ''
                        }`}
                    >
                      {/* Member Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${member.is_active
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-gray-200 text-gray-600 border border-gray-300'
                            }`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{member.name}</span>
                              <span className="text-[10px] font-mono font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {employeeId}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderRoleBadge(member.role)}
                      </td>

                      {/* Department & Team */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{member.department || '—'}</div>
                        <div className="text-xs text-gray-500">{member.team || (member.report_portfolio ? `Portfolio: ${member.report_portfolio}` : '—')}</div>
                      </td>

                      {/* Reporting Manager */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {member.manager ? (
                          <div>
                            <div className="font-medium text-gray-900">{member.manager.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{member.manager.role.replace(/_/g, ' ')}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Executive Head</span>
                        )}
                      </td>

                      {/* Quarter Batch */}
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          {member.quarter_batch || '—'}
                        </span>
                      </td>

                      {/* Active / Inactive Status */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        >
                          <PencilIcon className="w-3.5 h-3.5 text-gray-500" />
                          Edit
                        </button>

                        {member.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => setStatusConfirmUser(member)}
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${member.is_active
                                ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                              }`}
                          >
                            {member.is_active ? 'Deactivate' : 'Restore'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 5. ADD MEMBER MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 sm:p-8 relative">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <UserPlusIcon className="w-6 h-6 text-amber-500" />
              Add New Member
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Create an account with a temporary password (min 12 chars). Member can change password after initial login.
            </p>

            {formErrors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kasun Jayawardena"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@altrium.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                  <span>Temporary Password (min 12 characters) *</span>
                  <LockClosedIcon className="w-4 h-4 text-gray-400" />
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 12 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 font-mono"
                />
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    let defaultDept = formData.department;
                    let defaultTeam = formData.team;

                    if (newRole === 'hr_manager') {
                      defaultDept = 'Human Resources';
                      defaultTeam = 'HR';
                    } else if (newRole === 'operational_manager') {
                      defaultDept = 'Management';
                      defaultTeam = 'Executive';
                    } else if (newRole === 'admin') {
                      defaultDept = 'Management';
                      defaultTeam = 'Administration';
                    }
                    setFormData({
                      ...formData,
                      role: newRole,
                      department: defaultDept,
                      team: defaultTeam
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Department & Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const teams = TEAMS_BY_DEPT[newDept] || [];
                      setFormData({
                        ...formData,
                        department: newDept,
                        team: teams[0] || ''
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {availableTeams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporting Manager & Quarter Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reporting Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="">None (Top Level / Direct)</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role.replace(/_/g, ' ')} - {m.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quarter Batch</label>
                  <select
                    value={formData.quarter_batch}
                    onChange={(e) => setFormData({ ...formData, quarter_batch: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="ALL">ALL (All Quarters)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  {submitting ? 'Creating...' : 'Create Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EDIT MEMBER MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 sm:p-8 relative">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <PencilIcon className="w-6 h-6 text-amber-500" />
              Edit Member Details
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Update account details, role appointment, and manager reporting structure.
            </p>

            {formErrors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
              </div>

              {/* Optional Reset Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                  <span>Reset Password (optional, min 12 chars)</span>
                  <LockClosedIcon className="w-4 h-4 text-gray-400" />
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 font-mono"
                />
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>

              {/* Role Appointment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Appointed Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Department & Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const teams = TEAMS_BY_DEPT[newDept] || [];
                      setFormData({
                        ...formData,
                        department: newDept,
                        team: teams[0] || ''
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    {availableTeams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporting Manager & Quarter Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reporting Manager</label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="">None (Executive / Top Level)</option>
                    {managers
                      .filter((m) => m.id !== selectedMember.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role.replace(/_/g, ' ')} - {m.department})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quarter Batch</label>
                  <select
                    value={formData.quarter_batch}
                    onChange={(e) => setFormData({ ...formData, quarter_batch: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="ALL">ALL (All Quarters)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DEACTIVATE / RESTORE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {statusConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {statusConfirmUser.is_active ? 'Deactivate Member Access' : 'Restore Member Access'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {statusConfirmUser.is_active ? (
                <>
                  Are you sure you want to deactivate access for <strong className="text-gray-900">{statusConfirmUser.name}</strong>?
                  <br /><br />
                  <span className="text-xs text-amber-800 bg-amber-50 p-2 rounded block border border-amber-200">
                    ℹ️ All historical reviews, tasks, submitted plans, reports, and evidence remain 100% preserved in the database.
                  </span>
                </>
              ) : (
                <>
                  Restore system access for <strong className="text-gray-900">{statusConfirmUser.name}</strong>? The member will be able to log in and participate in performance cycles.
                </>
              )}
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStatusConfirmUser(null)}
                disabled={statusSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusToggle}
                disabled={statusSubmitting}
                className={statusConfirmUser.is_active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
              >
                {statusSubmitting ? 'Updating...' : statusConfirmUser.is_active ? 'Yes, Deactivate' : 'Yes, Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
