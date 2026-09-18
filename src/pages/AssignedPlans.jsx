import { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import PlanDetailsModal from '../components/plans/PlanDetailsModal';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function AssignedPlans() {
  const { currentUser } = useAuth();
  const isCompanyManager = currentUser?.role === 'operational_manager' || currentUser?.role === 'company_manager';

  const [activeTab, setActiveTab] = useState('PIP'); // 'PIP' or 'PDP'
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'pending', 'evidence_submitted', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const triggerBtnRef = useRef(null);

  const fetchAssignedPlans = () => {
    return api.get('/plans/assigned')
      .then((res) => {
        setPlans(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch assigned plans:', err);
        setError(err.response?.data?.message || 'Failed to load assigned plans. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleManualRefresh = () => {
    setLoading(true);
    setError('');
    fetchAssignedPlans();
  };

  useEffect(() => {
    fetchAssignedPlans();
  }, []);

  // Separate plans by type
  const pipPlans = useMemo(() => plans.filter(p => p.type === 'PIP'), [plans]);
  const pdpPlans = useMemo(() => plans.filter(p => p.type === 'PDP'), [plans]);

  // Apply search & status filter to current active tab
  const currentTabPlans = activeTab === 'PIP' ? pipPlans : pdpPlans;

  const filteredPlans = useMemo(() => {
    return currentTabPlans.filter((plan) => {
      // Status filter
      if (statusFilter !== 'ALL' && plan.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const recipientName = plan.recipient?.name?.toLowerCase() || '';
        const title = plan.title?.toLowerCase() || '';
        const team = plan.recipient?.team?.toLowerCase() || '';
        const dept = plan.recipient?.department?.toLowerCase() || '';
        return recipientName.includes(query) || title.includes(query) || team.includes(query) || dept.includes(query);
      }
      return true;
    });
  }, [currentTabPlans, statusFilter, searchQuery]);

  const pipCount = pipPlans.length;
  const pdpCount = pdpPlans.length;
  const activePipCount = pipPlans.filter(p => p.status !== 'completed').length;
  const activePdpCount = pdpPlans.filter(p => p.status !== 'completed').length;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">
            {isCompanyManager
              ? 'EXECUTIVE GOVERNANCE'
              : currentUser?.department
              ? `${currentUser.department.toUpperCase()} DEPARTMENT`
              : 'MANAGER VIEW'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
            Assigned PIP & PDP Plans
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Inspect submitted deliverables, track lifecycle deadlines, provide feedback, and conclude active plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-xs px-3.5 py-2 font-medium"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Performance Improvement (PIP)
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pipCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {activePipCount} active • {pipCount - activePipCount} concluded
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Professional Development (PDP)
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pdpCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {activePdpCount} ongoing • {pdpCount - activePdpCount} completed
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
            Total Assigned Plans
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{plans.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {plans.filter(p => p.status === 'evidence_submitted').length} with evidence submitted
          </p>
        </div>
      </div>

      {/* Main Tabs and Content Container */}
      <Card>
        {/* Accessible Tab Navigation */}
        <div className="border-b border-gray-200 pb-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex space-x-2" role="tablist" aria-label="Assigned Plan Categories">
              <button
                type="button"
                role="tab"
                id="tab-pip"
                aria-selected={activeTab === 'PIP'}
                aria-controls="panel-pip"
                onClick={() => setActiveTab('PIP')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'PIP'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>PIP Plans</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'PIP' ? 'bg-black/15 text-black' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pipCount}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-pdp"
                aria-selected={activeTab === 'PDP'}
                aria-controls="panel-pdp"
                onClick={() => setActiveTab('PDP')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === 'PDP'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>PDP Plans</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'PDP' ? 'bg-black/15 text-black' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pdpCount}
                </span>
              </button>
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search recipient or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden w-full sm:w-52"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter plans by status"
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="evidence_submitted">Evidence Submitted</option>
                <option value="completed">Completed / Concluded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div
          role="tabpanel"
          id={activeTab === 'PIP' ? 'panel-pip' : 'panel-pdp'}
          aria-labelledby={activeTab === 'PIP' ? 'tab-pip' : 'tab-pdp'}
        >
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <div className="inline-flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading {activeTab} plans...</span>
              </div>
            </div>
          ) : error ? (
            <div className="py-6 px-4 bg-red-50 border border-red-200 rounded-lg text-center my-2">
              <p className="text-red-700 font-medium text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchAssignedPlans}
                className="mt-2 inline-flex items-center px-3 py-1 border border-red-300 text-xs font-semibold rounded text-red-800 bg-white hover:bg-red-50 cursor-pointer shadow-xs"
              >
                Retry
              </button>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-semibold text-gray-700 text-sm">
                No {activeTab} plans found
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No plans match your search and filter criteria.'
                  : `You have not assigned any ${activeTab} plans yet.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="px-3.5 py-3 min-w-[140px]">Recipient</th>
                    <th scope="col" className="px-3.5 py-3 min-w-[180px]">Plan Title</th>
                    <th scope="col" className="px-3.5 py-3 w-24">Cycle</th>
                    {activeTab === 'PIP' && (
                      <th scope="col" className="px-3.5 py-3 min-w-[130px]">Evidence Deadline</th>
                    )}
                    <th scope="col" className="px-3.5 py-3 w-28">Status</th>
                    <th scope="col" className="px-3.5 py-3 w-24">Evidence</th>
                    <th scope="col" className="px-3.5 py-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPlans.map((planItem) => {
                    const evCount = planItem.evidences ? planItem.evidences.length : 0;
                    const displayStatus = planItem.status === 'evidence_submitted'
                      ? 'Evidence Submitted'
                      : planItem.status === 'completed'
                      ? 'Completed'
                      : 'Pending';

                    return (
                      <tr key={planItem.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-3.5 py-3 text-sm font-semibold text-gray-900">
                          {planItem.recipient?.name}
                          <span className="block text-[11px] text-gray-500 font-normal capitalize">
                            {isCompanyManager && planItem.recipient?.department
                              ? `${planItem.recipient.department} Department`
                              : planItem.recipient?.team || planItem.recipient?.role?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-sm text-gray-800 font-medium">
                          <span className="line-clamp-2">{planItem.title}</span>
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap text-gray-600 font-medium">
                          {planItem.quarter} {planItem.year}
                        </td>

                        {activeTab === 'PIP' && (
                          <td className="px-3.5 py-3 whitespace-nowrap text-gray-700">
                            {planItem.due_date || 'Deadline not specified'}
                          </td>
                        )}

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <StatusBadge status={displayStatus} />
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {evCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                              <span>📎</span> {evCount} {evCount === 1 ? 'file' : 'files'}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No files</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap text-center">
                          <Button
                            variant="outline"
                            className="text-xs px-3 py-1 font-semibold text-amber-800 border-amber-300 hover:bg-amber-50 shadow-2xs"
                            onClick={(e) => {
                              triggerBtnRef.current = e.currentTarget;
                              setSelectedPlanId(planItem.id);
                            }}
                          >
                            View Plan
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Plan Details Modal for Assigning Manager */}
      {selectedPlanId && (
        <PlanDetailsModal
          planId={selectedPlanId}
          onClose={() => {
            setSelectedPlanId(null);
            fetchAssignedPlans();
            if (triggerBtnRef.current) {
              triggerBtnRef.current.focus();
            }
          }}
          onEvidenceSubmitted={() => {
            fetchAssignedPlans();
          }}
        />
      )}
    </div>
  );
}
