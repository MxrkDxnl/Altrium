import { Link } from 'react-router-dom';

export default function NeedsAttentionSection({ items = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            Needs Attention
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 mt-0.5">
            Pending reviews, submitted evidence, and upcoming deadlines
          </p>
        </div>
        {items.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 self-start sm:self-auto">
            {items.length} {items.length === 1 ? 'Action Item' : 'Action Items'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900">All caught up!</h3>
          <p className="text-xs text-gray-700 mt-1 max-w-sm mx-auto">
            No items require your attention right now.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 mt-3">
          {items.map((item) => {
            const isUrgent = item.priority === 'urgent' || item.priority === 'high';
            return (
              <div
                key={item.id}
                className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <h3 className="text-sm font-bold text-gray-900 truncate">{item.title}</h3>
                    {item.dueDate && (
                      <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {item.dueDate}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 mt-1 pl-4">
                    {item.description}
                  </p>
                </div>

                <div className="pl-4 sm:pl-0 flex-shrink-0">
                  <Link
                    to={item.actionUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-sm transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
