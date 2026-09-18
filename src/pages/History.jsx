import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import PlanDetailsModal from '../components/plans/PlanDetailsModal';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function History() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Access Control: Who can see 'All Authorized Records'?
  // - Authorized manager roles (admin, department_manager, team_manager, hr_manager)
  // - HR employees with designated report_portfolio (e.g. Ayesha, Ruwan)
  // Ordinary employees without report portfolio (e.g. Dinesh, Nethmi) see Personal History ONLY.
  const isManager = ['team_manager', 'department_manager', 'admin', 'operational_manager', 'company_manager', 'hr_manager'].includes(currentUser?.role);
  const isHrPortfolioHolder = ['Human Resources', 'HR'].includes(currentUser?.department) &&
    currentUser?.role === 'employee' &&
    Boolean(currentUser?.report_portfolio);
  const canAccessAllRecords = isManager || isHrPortfolioHolder;

  // Tab State: 'personal' (default) vs 'all' (only allowed if authorized)
  const tabParam = searchParams.get('tab');
  const activeTab = (canAccessAllRecords && (tabParam === 'all' || tabParam === 'authorized')) ? 'all' : 'personal';

  const personalTabRef = useRef(null);
  const allTabRef = useRef(null);

  // Filter State
  const [year, setYear] = useState('all');
  const [quarter, setQuarter] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Available Filter Options (discovered dynamically from user records for active scope)
  const [filterOptions, setFilterOptions] = useState({
    years: [2026],
    quarters: ['Q1', 'Q2', 'Q3'],
    types: [],
    statuses: [],
    activeCycle: { quarter: 'Q3', year: 2026 }
  });

  // Effective type: exclude department_report when in personal scope
  const effectiveType = (activeTab === 'personal' && type === 'department_report') ? 'all' : type;

  // Data & Loading States
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const searchDebounceRef = useRef(null);

  // Switch Tab Handler
  const handleTabChange = (newTab) => {
    if (!canAccessAllRecords) return;
    if (newTab === activeTab) return;
    setLoading(true);
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === 'all') {
        next.set('tab', 'all');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  // Accessible Keyboard Navigation for Tabs
  const handleKeyDownTabs = (e) => {
    if (!canAccessAllRecords) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = activeTab === 'personal' ? 'all' : 'personal';
      handleTabChange(nextTab);
      if (nextTab === 'personal') {
        personalTabRef.current?.focus();
      } else {
        allTabRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleTabChange('personal');
      personalTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleTabChange('all');
      allTabRef.current?.focus();
    }
  };

  // Fetch Filter Metadata scoped by activeTab
  useEffect(() => {
    let active = true;
    api.get('/history/filters', { params: { scope: activeTab } })
      .then(res => {
        if (active && res.data) {
          setFilterOptions({
            years: res.data.years || [2026],
            quarters: res.data.quarters || ['Q1', 'Q2', 'Q3'],
            types: res.data.types || [],
            statuses: res.data.statuses || [],
            activeCycle: res.data.activeCycle || { quarter: 'Q3', year: 2026 }
          });
        }
      })
      .catch(err => {
        console.error('Failed to load history filters:', err);
      });
    return () => { active = false; };
  }, [activeTab]);

  // Fetch Historical Records scoped by activeTab
  useEffect(() => {
    let active = true;

    const params = {
      scope: activeTab,
      page,
      limit,
    };
    if (year !== 'all') params.year = year;
    if (quarter !== 'all') params.quarter = quarter;
    if (effectiveType !== 'all') params.type = effectiveType;
    if (status !== 'all') params.status = status;
    if (search.trim()) params.search = search.trim();

    api.get('/history', { params })
      .then(res => {
        if (active) {
          setRecords(res.data.records || []);
          setPagination(res.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
          setError('');
        }
      })
      .catch(err => {
        if (active) {
          console.error('Failed to fetch historical records:', err);
          setError(err.response?.data?.message || 'Failed to load historical records. Please try again.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab, page, limit, year, quarter, effectiveType, status, search, reloadKey]);

  // Handle Search Input with debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(val);
    }, 300);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setYear('all');
    setQuarter('all');
    setType('all');
    setStatus('all');
    setSearch('');
    setPage(1);
  };

  // Open Review Details Modal
  const handleOpenReview = async (reviewId) => {
    setSelectedReview(null);
    try {
      const res = await api.get(`/history/review/${reviewId}`);
      setSelectedReview(res.data);
    } catch (err) {
      console.error('Failed to load review details:', err);
      alert(err.response?.data?.message || 'Failed to load review details.');
    }
  };

  // Open Department Report Details Modal
  const handleOpenReport = async (reportId) => {
    setSelectedReport(null);
    try {
      const res = await api.get(`/reports/${reportId}`);
      setSelectedReport(res.data);
    } catch (err) {
      console.error('Failed to load report details:', err);
      alert(err.response?.data?.message || 'Failed to load report details.');
    }
  };

  // Download Report Attachment
  const handleDownloadReportFile = async (reportId, filename) => {
    try {
      const res = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'department_report');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report file:', err);
      alert('Error downloading report document. Please try again.');
    }
  };

  // Format Type Label
  const formatTypeLabel = (t) => {
    switch (t) {
      case 'self_review': return 'Self Assessment';
      case 'peer_review': return 'Peer Review';
      case 'upward_review': return 'Upward Review';
      case 'downward_review': return 'Downward Review';
      case 'pip': return 'PIP Plan';
      case 'pdp': return 'PDP Plan';
      case 'department_report': return 'Department Report';
      default: return (t || 'Record').replace('_', ' ').toUpperCase();
    }
  };

  // Format Type Badge Style
  const getTypeBadgeClass = (t) => {
    switch (t) {
      case 'self_review': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'peer_review': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'upward_review': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'downward_review': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'pip': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'pdp': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'department_report': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full pb-12 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">
            PERFORMANCE & RECORDS ARCHIVE
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
            Historical Records
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Inspect authorized past performance reviews, development plans, evidence submissions, and department reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-gray-100 text-gray-800 py-1.5 px-3 rounded-md text-sm font-medium border border-gray-200 shadow-2xs">
            Active Cycle: {filterOptions.activeCycle.quarter} {filterOptions.activeCycle.year}
          </span>
        </div>
      </div>

      {/* Internal Navigation Tabs (Rendered only for users authorized to access All Authorized Records) */}
      {canAccessAllRecords && (
        <div
          role="tablist"
          aria-label="History record scope"
          onKeyDown={handleKeyDownTabs}
          className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-xl border border-gray-200/80 w-full sm:w-fit"
        >
          <button
            ref={personalTabRef}
            role="tab"
            id="tab-personal"
            aria-selected={activeTab === 'personal'}
            aria-controls="tabpanel-history"
            tabIndex={activeTab === 'personal' ? 0 : -1}
            onClick={() => handleTabChange('personal')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60 ring-1 ring-black/5 font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'personal' ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Personal History</span>
            {activeTab === 'personal' && !loading && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-900 rounded-full font-bold">
                {pagination.total}
              </span>
            )}
          </button>

          <button
            ref={allTabRef}
            role="tab"
            id="tab-all"
            aria-selected={activeTab === 'all'}
            aria-controls="tabpanel-history"
            tabIndex={activeTab === 'all' ? 0 : -1}
            onClick={() => handleTabChange('all')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60 ring-1 ring-black/5 font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'all' ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>All Authorized Records</span>
            {activeTab === 'all' && !loading && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-900 rounded-full font-bold">
                {pagination.total}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Tab Panel / Records Content */}
      <div
        role={canAccessAllRecords ? 'tabpanel' : undefined}
        id={canAccessAllRecords ? 'tabpanel-history' : undefined}
        aria-labelledby={canAccessAllRecords ? (activeTab === 'personal' ? 'tab-personal' : 'tab-all') : undefined}
        className="space-y-6"
      >
        {/* Filter Toolbar Card */}
        <Card className="w-full">
          <div className="p-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Year Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setPage(1); }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  <option value="all">All Years</option>
                  {filterOptions.years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Quarter Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => { setQuarter(e.target.value); setPage(1); }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  <option value="all">All Quarters</option>
                  <option value="Q1">Q1 (Jan – Apr)</option>
                  <option value="Q2">Q2 (May – Aug)</option>
                  <option value="Q3">Q3 (Sep – Dec)</option>
                </select>
              </div>

              {/* Record Type Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Record Type</label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value); setPage(1); }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  <option value="all">All Record Types</option>
                  <option value="review">All Reviews</option>
                  <option value="self_review">Self Assessment</option>
                  <option value="peer_review">Peer Review</option>
                  <option value="upward_review">Upward Review</option>
                  <option value="downward_review">Downward Review</option>
                  <option value="plan">All Plans (PIP / PDP)</option>
                  <option value="pip">PIP</option>
                  <option value="pdp">PDP</option>
                  {activeTab === 'all' && (currentUser?.role === 'department_manager' || currentUser?.report_portfolio) ? (
                    <option value="department_report">Department Report</option>
                  ) : null}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="evidence_submitted">Evidence Submitted</option>
                  <option value="submitted">Submitted</option>
                  <option value="received">Received</option>
                </select>
              </div>

              {/* Search Input */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search title, name..."
                  defaultValue={search}
                  onChange={handleSearchChange}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                />
              </div>
            </div>

            {/* Active Filter Tags & Reset */}
            {(year !== 'all' || quarter !== 'all' || type !== 'all' || status !== 'all' || search) && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-700">Active Filters:</span>
                  {year !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded border">Year: {year}</span>}
                  {quarter !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded border">Quarter: {quarter}</span>}
                  {type !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded border">Type: {formatTypeLabel(type)}</span>}
                  {status !== 'all' && <span className="bg-gray-100 px-2 py-0.5 rounded border">Status: {status}</span>}
                  {search && <span className="bg-gray-100 px-2 py-0.5 rounded border">Search: "{search}"</span>}
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Main Records Table Card */}
        <Card
          title={activeTab === 'personal' ? 'Personal Performance History' : 'All Authorized Performance Records'}
          subtitle={`Showing ${records.length} of ${pagination.total} records (${activeTab === 'personal' ? 'Personal Scope' : 'Authorized Scope'})`}
        >
          {error ? (
            <div className="p-6 text-center">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm mb-4 inline-block max-w-md">
                <p className="font-semibold mb-1">Failed to load history records</p>
                <p>{error}</p>
              </div>
              <div>
                <Button onClick={() => setReloadKey(k => k + 1)} className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold px-4 py-2">
                  Retry
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-gray-500">
              <svg className="animate-spin h-6 w-6 text-amber-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <p className="text-sm">Loading historical records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {activeTab === 'personal' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-800">
                {activeTab === 'personal' ? 'No personal records found' : 'No historical records found'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
                {activeTab === 'personal'
                  ? (year !== 'all' || quarter !== 'all' || type !== 'all' || status !== 'all' || search)
                    ? 'No personal performance reviews or development plans match the active filters.'
                    : 'You currently have no submitted self-assessments, authored reviews, or assigned development plans.'
                  : (year !== 'all' || quarter !== 'all' || type !== 'all' || status !== 'all' || search)
                    ? 'No performance reviews, plans, or reports match the selected filters.'
                    : 'No authorized records are currently available in your archive.'}
              </p>
              {(year !== 'all' || quarter !== 'all' || type !== 'all' || status !== 'all' || search) && (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 text-xs font-semibold text-amber-800 border-amber-300"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Record Title / Subject
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                      Type
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                      Cycle
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                      Date
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                      Status
                    </th>
                    <th className="px-3.5 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((rec) => {
                    const displayStatus = rec.status === 'completed'
                      ? 'Completed'
                      : rec.is_expired
                      ? 'Expired'
                      : rec.status === 'evidence_submitted'
                      ? 'Evidence Submitted'
                      : rec.status === 'submitted'
                      ? 'Submitted'
                      : rec.status === 'received'
                      ? 'Received'
                      : 'Pending';

                    return (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        {/* Title & Context */}
                        <td className="px-3.5 py-3 text-sm">
                          <div className="font-semibold text-gray-900 break-words max-w-xs sm:max-w-md">
                            {rec.title}
                          </div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                            {rec.author && (
                              <span>By: <strong className="font-medium text-gray-700">{rec.author.name}</strong></span>
                            )}
                            {rec.subject && (
                              <span>Subject: <strong className="font-medium text-gray-700">{rec.subject.name}</strong></span>
                            )}
                            {rec.department && (
                              <span className="text-gray-400">• {rec.department}</span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadgeClass(rec.record_type)}`}>
                            {formatTypeLabel(rec.record_type)}
                          </span>
                        </td>

                        {/* Cycle */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-700 font-medium">
                          {rec.quarter} {rec.year}
                        </td>

                        {/* Dates */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-500">
                          {rec.submitted_at && (
                            <div>{new Date(rec.submitted_at).toLocaleDateString()}</div>
                          )}
                          {rec.due_date && (
                            <div className="text-[11px] text-amber-700">Due: {rec.due_date}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-xs">
                          <StatusBadge status={displayStatus} />
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {rec.entity_type === 'review' && (
                              <button
                                onClick={() => handleOpenReview(rec.entity_id)}
                                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded border border-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                View Details
                              </button>
                            )}

                            {rec.entity_type === 'plan' && (
                              <button
                                onClick={() => setSelectedPlanId(rec.entity_id)}
                                className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium rounded border border-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                View Plan
                              </button>
                            )}

                            {rec.entity_type === 'report' && (
                              <>
                                <button
                                  onClick={() => handleOpenReport(rec.entity_id)}
                                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded border border-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  View Details
                                </button>
                                {rec.original_filename && (
                                  <button
                                    onClick={() => handleDownloadReportFile(rec.entity_id, rec.original_filename)}
                                    className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium rounded border border-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    Download
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-sm">
              <div className="text-xs text-gray-500">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total items)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="text-xs px-3 py-1"
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        pagination.page === pNum
                          ? 'bg-amber-500 text-black'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="text-xs px-3 py-1"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL 1: PLAN DETAILS MODAL */}
      {selectedPlanId && (
        <PlanDetailsModal
          planId={selectedPlanId}
          onClose={() => setSelectedPlanId(null)}
          onEvidenceSubmitted={() => setReloadKey(k => k + 1)}
        />
      )}

      {/* MODAL 2: REVIEW DETAILS MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTypeBadgeClass(selectedReview.type)}`}>
                    {formatTypeLabel(selectedReview.type)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedReview.quarter} {selectedReview.year}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedReview.type === 'self_review' ? 'Self Assessment Details' : `Review for ${selectedReview.reviewee?.name || 'Reviewee'}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">Reviewer</span>
                  <span className="font-semibold text-gray-900">{selectedReview.reviewer?.name || 'Reviewer'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">Reviewee</span>
                  <span className="font-semibold text-gray-900">{selectedReview.reviewee?.name || 'Reviewee'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">Submitted Date</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedReview.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">Department</span>
                  <span className="font-semibold text-gray-900">{selectedReview.reviewee?.department || 'Department'}</span>
                </div>
              </div>

              {/* Form Content */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Review Responses</h4>
                <div className="space-y-3">
                  {selectedReview.content && typeof selectedReview.content === 'object' ? (
                    Object.entries(selectedReview.content).map(([key, val]) => (
                      <div key={key} className="p-3 bg-white border border-gray-200 rounded-md">
                        <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider mb-1">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                          {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white border border-gray-200 rounded-md text-sm text-gray-800">
                      {String(selectedReview.content || 'No detailed content available')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedReview(null)} className="text-xs px-4 py-1.5">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DEPARTMENT REPORT DETAILS MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    {selectedReport.department} Department
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-800">
                    Rev {selectedReport.revision_number}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedReport.quarter} {selectedReport.year}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{selectedReport.title}</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Submitting Manager</span>
                  <span className="font-semibold text-gray-900">{selectedReport.author?.name || 'Department Manager'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Designated HR</span>
                  <span className="font-semibold text-gray-900">{selectedReport.recipient?.name || 'HR Recipient'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Submitted At</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedReport.submitted_at || selectedReport.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Attached File</span>
                  <span className="font-semibold text-amber-700 truncate block">
                    {selectedReport.original_filename}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. Reviews & Performance Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.reviews_summary}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  2. PIP Progress & Remediation Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.pip_summary}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  3. PDP Growth & Architecture Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.pdp_summary}
                </div>
              </div>

              {selectedReport.revision_notes && (
                <div>
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
                    4. Revision Notes
                  </h4>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 whitespace-pre-wrap">
                    {selectedReport.revision_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                {selectedReport.original_filename && (
                  <Button
                    onClick={() => handleDownloadReportFile(selectedReport.id, selectedReport.original_filename)}
                    className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold px-4 py-1.5"
                  >
                    Download Document ({selectedReport.original_filename})
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setSelectedReport(null)} className="text-xs px-4 py-1.5">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
