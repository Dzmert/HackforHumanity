// Shared deadline / countdown logic. All comparisons happen in Australia/Sydney
// on plain YYYY-MM-DD values so there are no off-by-one timezone errors.

const ZONE = 'Australia/Sydney';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today in Sydney as YYYY-MM-DD. */
export const todayInSydney = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const toIsoDay = (value) => {
  if (!value) return null;
  const text = String(value);
  const day = text.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
};

const asUtc = (isoDay) => {
  const [year, month, day] = isoDay.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

/** Whole days from today (Sydney) until the given date. Negative = past. Null when no date. */
export const daysUntil = (value) => {
  const day = toIsoDay(value);
  if (!day) return null;
  return Math.round((asUtc(day) - asUtc(todayInSydney())) / 86400000);
};

/** "20 Oct 2026" or "N/A". */
export const formatDate = (value) => {
  const day = toIsoDay(value);
  if (!day) return 'N/A';
  const [year, month, date] = day.split('-');
  return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`;
};

/** Human countdown text, or null when there is no date. */
export const countdownLabel = (value) => {
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < -1) return `OVERDUE BY ${Math.abs(days)} DAYS`;
  if (days === -1) return 'OVERDUE BY 1 DAY';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days remaining`;
};

export const isOverdue = (value) => {
  const days = daysUntil(value);
  return days !== null && days < 0;
};

/** Tone for countdown text: overdue, soon (within 7 days) or calm. */
export const countdownTone = (value) => {
  const days = daysUntil(value);
  if (days === null) return 'text-[#756760]';
  if (days < 0) return 'text-[#8A2E1D] font-semibold';
  if (days <= 7) return 'text-[#A45846] font-medium';
  return 'text-[#756760]';
};

export const isThisMonth = (value) => {
  const day = toIsoDay(value);
  return !!day && day.slice(0, 7) === todayInSydney().slice(0, 7);
};

/**
 * Nearest outstanding deadline for a grant: its own key dates plus the due dates
 * of requirements that are not completed. Returns { label, date } or null.
 */
export const nextDeadline = (grant, requirements = []) => {
  const candidates = [
    { label: 'Application due', date: toIsoDay(grant.applicationDueDate) },
    { label: 'Acquittal due', date: toIsoDay(grant.acquittalDueDate) },
    { label: 'Renewal due', date: toIsoDay(grant.renewalDate || grant.renewal_date) },
    ...requirements.map(r => ({ label: r.title || 'Requirement due', date: toIsoDay(r.dueDate || r.due_date) }))
  ].filter(candidate => candidate.date);

  if (!candidates.length) return null;
  const upcoming = candidates.filter(c => daysUntil(c.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length) return upcoming[0];
  return candidates.sort((a, b) => b.date.localeCompare(a.date))[0];
};