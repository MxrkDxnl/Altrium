import { Link } from 'react-router-dom';

export default function DepartmentReportStatusSection({ departmentReportStatus }) {
  if (!departmentReportStatus) return null;

  // Case 1: Multiple reports (Amaya / HR Head overview)
  if (departmentReportStatus.reports && Array.isArray(departmentReportStatus.reports)) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Department Summary Reports
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 mt-0.5">
              Latest quarterly reports from department heads
            </p>
          </div>
          <Link
            to="/department-reports"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 underline self-start sm:self-auto"
          >
            Open Reports Center &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {departmentReportStatus.reports.map((report) => (
            <div
              key={report.id}
              className="bg-gray-50/70 border border-gray-200 rounded-lg p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">{report.department} Department</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2 py-0.5 rounded">
                    Revision #{report.revisionNumber}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mt-1">
                  Author: <span className="font-medium text-gray-900">{report.authorName}</span>
                </p>
                <p className="text-xs text-gray-700">
                  Designated HR Recipient: <span className="font-medium text-gray-900">{report.recipientName}</span>
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs text-gray-700">
                <span>Submitted: {new Date(report.submittedAt).toLocaleDateString()}</span>
                <Link
                  to="/department-reports"
                  className="font-bold text-amber-700 hover:text-amber-800"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Case 2: Single department report status (Dept Manager or Portfolio HR Specialist)
  const {
    department,
    quarter,
    year,
    revisionNumber,
    submittedAt,
    recipientName,
    recipientEmail,
    authorName,
    authorEmail,
    isSubmitted
  } = departmentReportStatus;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Department Report — {department}
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 mt-0.5">
            Quarterly summary report for {quarter} {year}
          </p>
        </div>
        <Link
          to="/department-reports"
          className="text-xs font-bold text-amber-700 hover:text-amber-800 underline self-start sm:self-auto"
        >
          Department Reports Page &rarr;
        </Link>
      </div>

      <div className="mt-4 bg-gray-50/70 border border-gray-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isSubmitted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {isSubmitted ? `Submitted (Revision #${revisionNumber})` : 'Pending Submission'}
            </span>
            <span className="text-xs font-semibold text-gray-700">Cycle {quarter} {year}</span>
          </div>

          <p className="text-sm font-semibold text-gray-900">
            {isSubmitted
              ? `Official summary report submitted on ${new Date(submittedAt).toLocaleDateString()} at ${new Date(submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Quarterly summary report has not been submitted yet for the current cycle.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700 pt-1">
            {authorName && <span>Author: <strong className="text-gray-900">{authorName}</strong>{authorEmail ? ` (${authorEmail})` : ''}</span>}
            {recipientName && <span>Designated HR Recipient: <strong className="text-gray-900">{recipientName}</strong>{recipientEmail ? ` (${recipientEmail})` : ''}</span>}
          </div>
        </div>

        <div className="flex-shrink-0">
          <Link
            to="/department-reports"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-sm transition-colors"
          >
            {isSubmitted ? 'Inspect Report & Revisions' : 'Prepare Department Report'}
          </Link>
        </div>
      </div>
    </div>
  );
}
