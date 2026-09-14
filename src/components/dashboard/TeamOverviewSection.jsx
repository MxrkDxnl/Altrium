export default function TeamOverviewSection({ teamOverview }) {
  if (!teamOverview || !teamOverview.rows || teamOverview.rows.length === 0) {
    return null;
  }

  const { type, title, subtitle, rows } = teamOverview;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      <div className="pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          {title}
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-gray-700 mt-0.5">{subtitle}</p>}
      </div>

      <div className="mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
              {type === 'teams_breakdown' && (
                <>
                  <th scope="col" className="px-3.5 py-3 rounded-l-lg">Team</th>
                  <th scope="col" className="px-3.5 py-3">Team Manager</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Headcount</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Current-Cycle Eligible</th>
                  <th scope="col" className="px-3.5 py-3 rounded-r-lg text-right">Review Completion</th>
                </>
              )}
              {type === 'direct_reports' && (
                <>
                  <th scope="col" className="px-3.5 py-3 rounded-l-lg">Team Member</th>
                  <th scope="col" className="px-3.5 py-3">Role</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Quarter Batch</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Active Plans</th>
                  <th scope="col" className="px-3.5 py-3 rounded-r-lg text-right">Review Status</th>
                </>
              )}
              {type === 'departments_overview' && (
                <>
                  <th scope="col" className="px-3.5 py-3 rounded-l-lg">Department</th>
                  <th scope="col" className="px-3.5 py-3">Department Head</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Headcount</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Current-Cycle Eligible</th>
                  <th scope="col" className="px-3.5 py-3 rounded-r-lg text-right">Review Progress</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id || row.teamName || row.email} className="hover:bg-gray-50/60 transition-colors">
                {type === 'teams_breakdown' && (
                  <>
                    <td className="px-3.5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                      {row.teamName}
                    </td>
                    <td className="px-3.5 py-3.5 text-gray-700 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{row.managerName}</div>
                      <div className="text-xs text-gray-700">{row.managerEmail}</div>
                    </td>
                    <td className="px-3.5 py-3.5 text-center font-medium text-gray-800">
                      {row.headcount}
                    </td>
                    <td className="px-3.5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        row.eligibleCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.eligibleCount} eligible
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <span className={`font-semibold text-xs ${row.hasAssignments ? 'text-gray-900' : 'text-gray-700 italic'}`}>
                        {row.reviewCompletion}
                      </span>
                    </td>
                  </>
                )}

                {type === 'direct_reports' && (
                  <>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-700">{row.email}</div>
                    </td>
                    <td className="px-3.5 py-3.5 text-gray-700 whitespace-nowrap font-medium">
                      {row.roleTitle}
                    </td>
                    <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        row.isEligible ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                      }`}>
                        Batch {row.quarterBatch || 'ALL'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                      {row.activePlansCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800">
                          {row.activePlansCount} active
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <span className="font-semibold text-xs text-gray-900">
                        {row.reviewStatus}
                      </span>
                    </td>
                  </>
                )}

                {type === 'departments_overview' && (
                  <>
                    <td className="px-3.5 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                      {row.department}
                    </td>
                    <td className="px-3.5 py-3.5 text-gray-700 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{row.managerName}</div>
                      <div className="text-xs text-gray-700">{row.managerEmail}</div>
                    </td>
                    <td className="px-3.5 py-3.5 text-center font-semibold text-gray-900">
                      {row.headcount}
                    </td>
                    <td className="px-3.5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        row.eligibleCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.eligibleCount} eligible
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      <span className={`font-semibold text-xs ${row.hasAssignments ? 'text-gray-900' : 'text-gray-700 italic'}`}>
                        {row.reviewCompletion}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
