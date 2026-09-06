import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInHours } from 'date-fns';

export const WEEK_OPTS = { weekStartsOn: 1 };
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
export const CONFIRM_WINDOW_HOURS = 48;
export const DEFAULT_ESCALATION_HOURS = 2;
export const CHURN_WEEKS = 4;

const ESCALATION_KEY = 'lous-place-escalation-hours';

export const readEscalationHours = () => Number(localStorage.getItem(ESCALATION_KEY)) || DEFAULT_ESCALATION_HOURS;
export const saveEscalationHours = (hours) => localStorage.setItem(ESCALATION_KEY, String(hours));

export const weekDays = (date) =>
  eachDayOfInterval({ start: startOfWeek(date, WEEK_OPTS), end: endOfWeek(date, WEEK_OPTS) });

export const monthDays = (date) =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), WEEK_OPTS),
    end: endOfWeek(endOfMonth(date), WEEK_OPTS)
  });

export const shiftsOnDay = (shifts, day) =>
  shifts
    .filter((s) => s.start_time && isSameDay(new Date(s.start_time), day))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

export const isThisWeek = (date, reference = new Date()) => {
  const value = new Date(date);
  return value >= startOfWeek(reference, WEEK_OPTS) && value <= endOfWeek(reference, WEEK_OPTS);
};

export const isInWeekOf = (date, reference) => {
  const value = new Date(date);
  return value >= startOfWeek(reference, WEEK_OPTS) && value <= endOfWeek(reference, WEEK_OPTS);
};

// Vertical placement within the week grid, as a percentage of the visible day.
export const blockPosition = (shift) => {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time || shift.start_time);
  const span = DAY_END_HOUR - DAY_START_HOUR;
  const startHours = start.getHours() + start.getMinutes() / 60 - DAY_START_HOUR;
  const endHours = end.getHours() + end.getMinutes() / 60 - DAY_START_HOUR;
  const top = Math.max(0, Math.min(startHours, span)) / span;
  const bottom = Math.max(0, Math.min(endHours, span)) / span;
  return { top: `${top * 100}%`, height: `${Math.max(bottom - top, 0.055) * 100}%` };
};

/**
 * The roster lifecycle, derived from the stored fields:
 * open → standby_notified → escalated → assigned (covered) → confirmed → completed
 * Pass escalationHours = Infinity to hide escalation (volunteer-facing views).
 */
export const shiftState = (shift, escalationHours = DEFAULT_ESCALATION_HOURS) => {
  if (shift.status === 'completed') return 'completed';
  if (shift.status === 'assigned') {
    const hoursAway = differenceInHours(new Date(shift.start_time), new Date());
    return hoursAway >= 0 && hoursAway <= CONFIRM_WINDOW_HOURS ? 'confirmed' : 'assigned';
  }
  if (!shift.standby_notified_at) return 'open';
  const waiting = differenceInHours(new Date(), new Date(shift.standby_notified_at));
  return waiting >= escalationHours ? 'escalated' : 'standby_notified';
};

export const awaitingCover = (state) => state === 'standby_notified' || state === 'escalated';

export const stateStyles = {
  open: 'border-2 border-dashed border-[#C08A6E] bg-[#FBF1E7] text-[#7D4037]',
  standby_notified: 'border-2 border-dashed border-[#A45846] bg-[#F2C6A8] text-[#7D4037]',
  escalated: 'border-2 border-[#5C2B24] bg-[#5C2B24] text-white',
  assigned: 'border border-[#A45846] bg-[#A45846] text-white',
  confirmed: 'border border-[#7D4037] bg-[#7D4037] text-white',
  completed: 'border border-[#D8CDBF] bg-[#F1EAE1] text-[#7B6E66]'
};

export const stateLabels = {
  open: 'Open for a volunteer',
  standby_notified: 'Standby notified',
  escalated: 'Escalated — needs attention',
  assigned: 'Covered',
  confirmed: 'Confirmed',
  completed: 'Complete'
};

export const stateSwatches = {
  open: 'border-2 border-dashed border-[#C08A6E] bg-[#FBF1E7]',
  standby_notified: 'border-2 border-dashed border-[#A45846] bg-[#F2C6A8]',
  escalated: 'bg-[#5C2B24]',
  assigned: 'bg-[#A45846]',
  confirmed: 'bg-[#7D4037]',
  completed: 'bg-[#F1EAE1] ring-1 ring-[#D8CDBF]'
};

export const partOfDay = (shift) => (new Date(shift.start_time).getHours() < 12 ? 'morning' : 'afternoon');

export const isStandbyEligible = (shift, availability) =>
  availability.some((slot) =>
    slot.day_of_week === new Date(shift.start_time).getDay() &&
    (!slot.part_of_day || slot.part_of_day === 'any' || slot.part_of_day === partOfDay(shift))
  );