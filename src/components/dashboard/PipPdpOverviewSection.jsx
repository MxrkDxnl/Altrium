import { Link } from 'react-router-dom';

export default function PipPdpOverviewSection({ pipPdpOverview, userRole }) {
  if (!pipPdpOverview) return null;

  const {
    activePips = [],
    ongoingPdps = [],
    completedPlansCount = 0,
    summaryOnly = false,
    totalPips = 0,
    totalPdps = 0,
  } = pipPdpOverview;

  const hasAnyPlans = activePips.length > 0 || ongoingPdps.length > 0 || completedPlansCount > 0 || totalPips > 0 || totalPdps > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            PIP / PDP Overview
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 mt-0.5">
            Active improvement and development plans
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {completedPlansCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {completedPlansCount} Concluded
            </span>
          )}
          {['team_manager', 'department_manager', 'operational_manager', 'company_manager', 'hr_manager'].includes(userRole) && (
            <Link
              to="/assigned-plans"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline ml-1"
            >
              Manage Plans &rarr;
            </Link>
          )}
        </div>
      </div>

      {!hasAnyPlans ? (
        <div className="py-8 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-700">No active improvement or development plans.</p>
          <p className="text-xs text-gray-600 mt-1">Assigned plans will appear here.</p>
        </div>
      ) : summaryOnly ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase text-amber-800">Active PIPs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalPips}</p>
            <p className="text-xs text-gray-700 mt-1">Performance Improvement Plans</p>
          </div>
          <div className="bg-blue-50/40 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase text-blue-800">Ongoing PDPs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalPdps}</p>
            <p className="text-xs text-gray-700 mt-1">Professional Development Goals</p>
          </div>
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-4">
            <p className="text-xs font-semibold uppercase text-emerald-800">Concluded Plans</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedPlansCount}</p>
            <p className="text-xs text-gray-700 mt-1">Completed & Archived</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {/* Active PIPs */}
          {activePips.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                Performance Improvement Plans (PIP)
              </h3>
              <div className="space-y-2.5">
                {activePips.map((pip) => (
                  <div
                    key={pip.id}
                    className="bg-amber-50/30 border border-amber-200/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{pip.title}</span>
                        {pip.isCrossCycle && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            Ongoing Cross-Cycle
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          pip.status === 'evidence_submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {pip.status === 'evidence_submitted' ? 'Evidence Submitted' : 'Pending Evidence'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 line-clamp-1">
                        {pip.recipientName ? <strong className="text-gray-900">{pip.recipientName}: </strong> : null}
                        {pip.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-700">
                        <span>Assigned: {pip.assignedDate}</span>
                        <span>•</span>
                        <span className="font-medium text-gray-900">Deadline: {pip.dueDate}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-100">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        pip.daysRemaining <= 7
                          ? 'bg-red-100 text-red-800'
                          : pip.daysRemaining <= 30
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {pip.daysRemaining} days remaining
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ongoing PDPs */}
          {ongoingPdps.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Professional Development Plans (PDP)
              </h3>
              <div className="space-y-2.5">
                {ongoingPdps.map((pdp) => (
                  <div
                    key={pdp.id}
                    className="bg-blue-50/20 border border-blue-200/70 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{pdp.title}</span>
                        {pdp.isCrossCycle && (
                          <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            Cycle {pdp.quarter} {pdp.year}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                          {pdp.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 line-clamp-1">
                        {pdp.recipientName ? <strong className="text-gray-900">{pdp.recipientName}: </strong> : null}
                        {pdp.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
