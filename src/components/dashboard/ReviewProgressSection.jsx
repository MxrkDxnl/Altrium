export default function ReviewProgressSection({ progress = {}, cycle = null }) {
  const categories = [
    { key: 'self', label: 'Self' },
    { key: 'peer', label: 'Peer' },
    { key: 'upward', label: 'Upward' },
    { key: 'downward', label: 'Downward' },
  ];

  const total = progress.total || { assigned: 0, completed: 0, pending: 0, percentage: 0, hasAssignments: false };
  const cycleLabel = cycle?.label || 'Active Cycle';

  // --- SVG Doughnut Calculations ---
  const radius = 56;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius; // ~351.858

  const hasAssignments = total.hasAssignments && total.assigned > 0;
  const completedCount = total.completed || 0;
  const pendingCount = total.pending || 0;
  const totalCount = total.assigned || 0;
  const completionPercentage = total.percentage || 0;

  const completedStrokeLength = hasAssignments ? (completedCount / totalCount) * circumference : 0;

  // --- SVG Stacked Vertical Bar Chart Calculations ---
  const rawMax = Math.max(
    progress.self?.assigned || 0,
    progress.peer?.assigned || 0,
    progress.upward?.assigned || 0,
    progress.downward?.assigned || 0,
    0
  );

  let maxScale = 4;
  let ticks = [0, 1, 2, 3, 4];
  if (rawMax > 12) {
    const step = Math.ceil(rawMax / 4);
    maxScale = step * 4;
    ticks = [0, step, step * 2, step * 3, maxScale];
  } else if (rawMax > 8) {
    maxScale = 12;
    ticks = [0, 3, 6, 9, 12];
  } else if (rawMax > 4) {
    maxScale = 8;
    ticks = [0, 2, 4, 6, 8];
  }

  // Chart coordinate geometry
  const svgWidth = 280;
  const svgHeight = 160;
  const marginLeft = 24;
  const marginRight = 12;
  const marginTop = 20;
  const marginBottom = 24;
  const plotWidth = svgWidth - marginLeft - marginRight; // 244
  const plotHeight = svgHeight - marginTop - marginBottom; // 116
  const yZero = marginTop + plotHeight; // 136
  const slotWidth = plotWidth / categories.length; // 61
  const barWidth = 28;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
      {/* Header with Cycle Context & Overall Summary Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Review Progress
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Task assignment and completion breakdown for <span className="font-semibold text-gray-900">{cycleLabel}</span>
          </p>
        </div>

        <div>
          {hasAssignments ? (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-semibold text-amber-900">Total:</span>
              <span className="text-sm font-bold text-amber-700">{completionPercentage}%</span>
              <span className="text-xs text-amber-900 font-medium">({completedCount}/{totalCount} completed)</span>
            </div>
          ) : (
            <span className="text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              No assignments
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Doughnut Chart (Left) and Stacked Vertical Bar Chart (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mt-5">
        {/* Left: Overall Doughnut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg
              className="w-40 h-40 transform -rotate-90"
              viewBox="0 0 144 144"
              role="img"
              aria-label={
                hasAssignments
                  ? `Overall review completion: ${completionPercentage}% (${completedCount} of ${totalCount} tasks completed)`
                  : 'Overall review completion: No assignments for the current cycle'
              }
            >
              {/* Background Ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className={hasAssignments ? 'text-gray-200' : 'text-gray-100'}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Completed Tasks Ring (Gold) */}
              {hasAssignments && completedStrokeLength > 0 && (
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="text-amber-500"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${completedStrokeLength} ${circumference}`}
                  strokeDashoffset="0"
                />
              )}
            </svg>

            {/* Centre Label (Percentage + Completed text) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              {hasAssignments ? (
                <>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-none">
                    {completionPercentage}%
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-1">
                    Completed
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-gray-500">No</span>
                  <span className="text-xs text-gray-400 font-medium">assignments</span>
                </>
              )}
            </div>
          </div>

          {/* Doughnut Legend with Exact Task Counts */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 text-xs mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-amber-600/30"></span>
              <span className="text-gray-700">
                Completed: <span className="font-bold text-gray-900">{completedCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200 inline-block border border-gray-300"></span>
              <span className="text-gray-700">
                Pending: <span className="font-bold text-gray-900">{pendingCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Stacked Vertical Bar Chart */}
        <div className="md:col-span-7 w-full flex flex-col justify-center">
          {/* Bar Chart Header & Legend */}
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Category Breakdown
            </span>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block border border-amber-600/30"></span>
                <span className="text-gray-700 text-[11px] font-medium">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block border border-gray-300"></span>
                <span className="text-gray-700 text-[11px] font-medium">Pending</span>
              </div>
            </div>
          </div>

          {/* SVG Stacked Bar Chart */}
          <div className="w-full overflow-hidden bg-gray-50/50 rounded-lg border border-gray-200 p-2 sm:p-3">
            <svg
              className="w-full h-44 sm:h-48 overflow-hidden"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              role="img"
              aria-label={`Category review breakdown bar chart for ${cycleLabel}`}
            >
              {/* Subtle Horizontal Gridlines & Y-Axis Whole-Number Ticks */}
              {ticks.map((tick) => {
                const y = yZero - (tick / maxScale) * plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={marginLeft}
                      y1={y}
                      x2={marginLeft + plotWidth}
                      y2={y}
                      stroke={tick === 0 ? '#9ca3af' : '#e5e7eb'}
                      strokeWidth={tick === 0 ? 1.2 : 1}
                      strokeDasharray={tick === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={marginLeft - 5}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] font-medium fill-gray-500 font-sans select-none"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Stacked Vertical Bars */}
              {categories.map(({ key, label }, i) => {
                const item = progress[key] || { assigned: 0, completed: 0, pending: 0, percentage: 0, hasAssignments: false };
                const assigned = item.assigned || 0;
                const completed = item.completed || 0;
                const pending = item.pending || 0;

                const slotCenterX = marginLeft + (i + 0.5) * slotWidth;
                const barX = slotCenterX - barWidth / 2;

                const totalHeight = maxScale > 0 ? (assigned / maxScale) * plotHeight : 0;
                const completedHeight = maxScale > 0 ? (completed / maxScale) * plotHeight : 0;
                const pendingHeight = maxScale > 0 ? (pending / maxScale) * plotHeight : 0;

                const completedY = yZero - completedHeight;
                const pendingY = yZero - totalHeight;

                return (
                  <g key={key}>
                    {/* Stacked Column Segments */}
                    {assigned > 0 ? (
                      <>
                        {/* Completed Segment (Gold - Bottom) */}
                        {completed > 0 && (
                          <rect
                            x={barX}
                            y={completedY}
                            width={barWidth}
                            height={completedHeight}
                            fill="#f59e0b"
                            rx={pending === 0 ? 3 : 0}
                          />
                        )}

                        {/* Pending Segment (Light Grey - Top) */}
                        {pending > 0 && (
                          <rect
                            x={barX}
                            y={pendingY}
                            width={barWidth}
                            height={pendingHeight}
                            fill="#e5e7eb"
                            rx={3}
                          />
                        )}

                        {/* Segment Number Inside Completed (if height permits) */}
                        {completedHeight >= 14 && (
                          <text
                            x={slotCenterX}
                            y={completedY + completedHeight / 2 + 3.5}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-amber-950 font-sans select-none pointer-events-none"
                          >
                            {completed}
                          </text>
                        )}

                        {/* Segment Number Inside Pending (if height permits) */}
                        {pendingHeight >= 14 && (
                          <text
                            x={slotCenterX}
                            y={pendingY + pendingHeight / 2 + 3.5}
                            textAnchor="middle"
                            className="text-[10px] font-semibold fill-gray-700 font-sans select-none pointer-events-none"
                          >
                            {pending}
                          </text>
                        )}

                        {/* Total Count Above Column */}
                        <text
                          x={slotCenterX}
                          y={pendingY - 5}
                          textAnchor="middle"
                          className="text-[11px] font-bold fill-gray-900 font-sans select-none"
                        >
                          {assigned}
                        </text>
                      </>
                    ) : (
                      /* Zero Assignments State */
                      <text
                        x={slotCenterX}
                        y={yZero - 5}
                        textAnchor="middle"
                        className="text-[10px] font-medium fill-gray-400 font-sans select-none"
                      >
                        0
                      </text>
                    )}

                    {/* Category Label (X-Axis) */}
                    <text
                      x={slotCenterX}
                      y={yZero + 16}
                      textAnchor="middle"
                      className="text-[11px] font-semibold fill-gray-700 font-sans select-none"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Accessible Screen Reader Table Equivalent */}
      <div className="sr-only max-w-0 max-h-0 overflow-hidden pointer-events-none" aria-hidden="false">
        <table className="w-0 h-0 overflow-hidden">
          <caption>
            Review Type task assignment and completion breakdown for {cycleLabel}
          </caption>
          <thead>
            <tr>
              <th scope="col">Review Type</th>
              <th scope="col">Completed Tasks</th>
              <th scope="col">Pending Tasks</th>
              <th scope="col">Total Assigned</th>
              <th scope="col">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(({ key, label }) => {
              const item = progress[key] || { assigned: 0, completed: 0, pending: 0, percentage: 0, hasAssignments: false };
              return (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{item.completed}</td>
                  <td>{item.pending}</td>
                  <td>{item.assigned}</td>
                  <td>{item.hasAssignments ? `${item.percentage}%` : 'No assignments'}</td>
                </tr>
              );
            })}
            <tr>
              <th scope="row">Overall Total</th>
              <td>{total.completed}</td>
              <td>{total.pending}</td>
              <td>{total.assigned}</td>
              <td>{total.hasAssignments ? `${total.percentage}%` : 'No assignments'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
