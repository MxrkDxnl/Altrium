/**
 * Asia/Colombo Quarter Cutoff Evaluator
 * 
 * Confirmed Quarter Boundaries:
 * - Q1: January 1 00:00:00 through April 30 23:59:59.999 (Exclusive Cutoff: May 1 00:00:00 +05:30)
 * - Q2: May 1 00:00:00 through August 31 23:59:59.999 (Exclusive Cutoff: September 1 00:00:00 +05:30)
 * - Q3: September 1 00:00:00 through December 31 23:59:59.999 (Exclusive Cutoff: January 1 (year + 1) 00:00:00 +05:30)
 */

function getQuarterBoundaries(quarter, year) {
  const y = parseInt(year, 10);
  let startISO, cutoffISO, endDisplayISO;

  if (quarter === 'Q1') {
    startISO = `${y}-01-01T00:00:00.000+05:30`;
    cutoffISO = `${y}-05-01T00:00:00.000+05:30`;
    endDisplayISO = `${y}-04-30T23:59:59.999+05:30`;
  } else if (quarter === 'Q2') {
    startISO = `${y}-05-01T00:00:00.000+05:30`;
    cutoffISO = `${y}-09-01T00:00:00.000+05:30`;
    endDisplayISO = `${y}-08-31T23:59:59.999+05:30`;
  } else if (quarter === 'Q3') {
    startISO = `${y}-09-01T00:00:00.000+05:30`;
    cutoffISO = `${y + 1}-01-01T00:00:00.000+05:30`;
    endDisplayISO = `${y}-12-31T23:59:59.999+05:30`;
  } else {
    // Fallback for Q4 or unknown
    startISO = `${y}-10-01T00:00:00.000+05:30`;
    cutoffISO = `${y + 1}-01-01T00:00:00.000+05:30`;
    endDisplayISO = `${y}-12-31T23:59:59.999+05:30`;
  }

  const startMs = Date.parse(startISO);
  const cutoffMs = Date.parse(cutoffISO);
  const endDisplayMs = Date.parse(endDisplayISO);

  return {
    quarter,
    year: y,
    startISO,
    cutoffISO,
    endDisplayISO,
    startMs,
    cutoffMs,
    endDisplayMs,
  };
}

/**
 * Check if the stored quarter and year is open for evidence submission based on server clock.
 * @param {string} quarter - e.g. 'Q1', 'Q2', 'Q3'
 * @param {number|string} year - e.g. 2026
 * @param {Date|number|string} [customNow] - Optional controlled test clock for boundary testing
 * @returns {object} Quarter status details
 */
function checkQuarterStatus(quarter, year, customNow = null) {
  const boundaries = getQuarterBoundaries(quarter, year);
  
  let nowMs;
  if (customNow instanceof Date) {
    nowMs = customNow.getTime();
  } else if (typeof customNow === 'number') {
    nowMs = customNow;
  } else if (typeof customNow === 'string') {
    nowMs = Date.parse(customNow);
  } else {
    nowMs = Date.now();
  }

  const isFuture = nowMs < boundaries.startMs;
  const isPast = nowMs >= boundaries.cutoffMs;
  const isOpen = !isFuture && !isPast;

  const formatDate = (ms) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(ms));
  };

  const startDateFormatted = formatDate(boundaries.startMs);
  const endDateFormatted = formatDate(boundaries.endDisplayMs);

  let reason;
  if (isOpen) {
    reason = `Open for submission through ${endDateFormatted}`;
  } else if (isPast) {
    reason = `Quarter closed — evidence submission ended on ${endDateFormatted}`;
  } else {
    reason = `Future quarter — evidence submission opens on ${startDateFormatted}`;
  }

  return {
    isOpen,
    isFuture,
    isPast,
    quarter,
    year: boundaries.year,
    startDate: startDateFormatted,
    endDate: endDateFormatted,
    startMs: boundaries.startMs,
    cutoffMs: boundaries.cutoffMs,
    reason,
  };
}

module.exports = {
  getQuarterBoundaries,
  checkQuarterStatus,
};
