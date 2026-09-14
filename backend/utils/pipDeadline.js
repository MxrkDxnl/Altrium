/**
 * PIP Evidence Deadline Calculator
 * 
 * Policy Rules:
 * 1. Universal PIP Deadline (All Existing & Newly Assigned PIPs):
 *    - Authoritative Deadline Date: August 30, 2027 (stored as '2027-08-30' in plans.due_date).
 *    - Evidence is allowed throughout August 30, 2027 in Asia/Colombo (+05:30); rejection begins August 31, 2027 at 00:00:00.
 *    - Exclusive Cutoff: 2027-08-31 00:00:00.000 +05:30 (start of August 31, 2027 in Asia/Colombo).
 *    - Note on Operational Calendar: Operational Q2 remains May–August and ends August 31.
 *      August 30 is the explicitly approved PIP deadline, not the calendar end of August.
 * 
 * 2. Centralized Server-Side Enforcement:
 *    - Legacy 12-month anniversary calculation is removed from active PIP assignment logic.
 *    - Client-supplied date overrides are ignored / prevented.
 *    - Date is NOT silently rolled forward for future cycles; any subsequent policy requires explicit confirmation.
 * 
 * 3. Lifecycle & Expiry:
 *    - Expiry is dynamically calculated and evaluated against the cutoff in Asia/Colombo.
 *    - Expiry never mutates plans.status in the database and never marks a plan completed.
 *    - Completed plans remain completed and cannot accept new submissions.
 */

const AUTHORITATIVE_PIP_DEADLINE = '2027-08-30';

function isLeapYear(year) {
  const y = parseInt(year, 10);
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

/**
 * Calculate PIP deadline and cutoff in Asia/Colombo.
 * @param {Date|string|number|object} assignmentTimestampOrPlan - Timestamp when plan was created, or plan object
 * @param {Date|string|number} [customNow] - Optional injected clock for test validation
 * @param {string} [explicitStoredDueDate] - Optional stored due_date (YYYY-MM-DD)
 * @returns {object} Calculated deadline details
 */
function calculatePipDeadline(assignmentTimestampOrPlan, customNow = null, explicitStoredDueDate = null) {
  let assignmentTimestamp = assignmentTimestampOrPlan;
  let storedDueDate = explicitStoredDueDate;

  // Handle plan object input
  if (assignmentTimestampOrPlan && typeof assignmentTimestampOrPlan === 'object' && !(assignmentTimestampOrPlan instanceof Date)) {
    assignmentTimestamp = assignmentTimestampOrPlan.createdAt || assignmentTimestampOrPlan.created_at || new Date();
    if (!storedDueDate && assignmentTimestampOrPlan.due_date) {
      storedDueDate = assignmentTimestampOrPlan.due_date;
    }
  }

  const created = new Date(assignmentTimestamp || Date.now());
  if (isNaN(created.getTime())) {
    throw new Error('Invalid assignment timestamp provided to calculatePipDeadline');
  }

  // Format created date parts in Asia/Colombo (+05:30)
  const colomboFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = colomboFormatter.formatToParts(created);
  const createdYear = parseInt(parts.find(p => p.type === 'year').value, 10);
  const createdMonth = parseInt(parts.find(p => p.type === 'month').value, 10);
  const createdDay = parseInt(parts.find(p => p.type === 'day').value, 10);

  // Authoritative deadline is August 30, 2027 for all PIP assignments
  // Stored due_date is respected if present, defaulting to AUTHORITATIVE_PIP_DEADLINE ('2027-08-30')
  const dueDateISO = (storedDueDate && typeof storedDueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(storedDueDate.trim()))
    ? storedDueDate.trim()
    : AUTHORITATIVE_PIP_DEADLINE;

  // Exclusive cutoff is start of next calendar day in Asia/Colombo (00:00:00.000 +05:30)
  // For '2027-08-30', cutoff is '2027-08-31T00:00:00.000+05:30'
  const dueDateObj = new Date(Date.parse(`${dueDateISO}T12:00:00.000+05:30`));
  dueDateObj.setDate(dueDateObj.getDate() + 1);
  const nextParts = colomboFormatter.formatToParts(dueDateObj);
  const nextYear = nextParts.find(p => p.type === 'year').value;
  const nextMonth = nextParts.find(p => p.type === 'month').value.padStart(2, '0');
  const nextDay = nextParts.find(p => p.type === 'day').value.padStart(2, '0');

  const cutoffISO = `${nextYear}-${nextMonth}-${nextDay}T00:00:00.000+05:30`;
  const cutoffMs = Date.parse(cutoffISO);

  // Evaluate against now / customNow
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

  const isPast = nowMs >= cutoffMs;
  const isOpen = !isPast;

  // Formatted display in English
  const dueDateFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(Date.parse(`${dueDateISO}T12:00:00.000+05:30`)));

  const assignmentDateFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(Date.parse(`${createdYear}-${String(createdMonth).padStart(2, '0')}-${String(createdDay).padStart(2, '0')}T12:00:00.000+05:30`)));

  return {
    assignmentDateISO: `${createdYear}-${String(createdMonth).padStart(2, '0')}-${String(createdDay).padStart(2, '0')}`,
    assignmentDateFormatted,
    dueDateISO,
    dueDateFormatted,
    lastPermittedDate: dueDateISO,
    cutoffISO,
    cutoffMs,
    isOpen,
    isPast,
    reason: isOpen
      ? `Evidence deadline: ${dueDateFormatted}`
      : `Submission deadline passed on ${dueDateFormatted}`
  };
}

module.exports = {
  AUTHORITATIVE_PIP_DEADLINE,
  isLeapYear,
  calculatePipDeadline
};
