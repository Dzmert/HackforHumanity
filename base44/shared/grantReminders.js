// Shared grant reminder rules: settings validation, deadline discovery,
// dedupe keys and email composition. All dates are handled in Australia/Sydney.
import { effectiveStatus } from './grants.js';

const ZONE = 'Australia/Sydney';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_SETTINGS = {
  reminderIntervals: [7, 5, 3, 1],
  emailRemindersEnabled: true,
  deviceNotificationsEnabled: true,
  ccEmails: []
};

export const DEADLINE_TYPES = {
  application: 'Application Due Date',
  acquittal: 'Acquittal Due Date',
  renewal: 'Renewal Date',
  requirement: 'Compliance Requirement Due Date'
};

export const todayInSydney = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const isoDay = (value) => {
  if (!value) return null;
  const day = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
};

const asUtc = (day) => {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
};

export const daysUntil = (value, today = todayInSydney()) => {
  const day = isoDay(value);
  if (!day) return null;
  return Math.round((asUtc(day) - asUtc(today)) / 86400000);
};

/** "15 February 2027" */
export const longDate = (value) => {
  const day = isoDay(value);
  if (!day) return 'N/A';
  const [year, month, date] = day.split('-');
  return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`;
};

export function validateSettings(input) {
  const errors = [];
  const raw = Array.isArray(input?.reminderIntervals) ? input.reminderIntervals : DEFAULT_SETTINGS.reminderIntervals;
  const intervals = [];
  for (const value of raw) {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      errors.push(`"${value}" is not a whole number of days between 0 and 365.`);
      continue;
    }
    if (!intervals.includes(days)) intervals.push(days);
  }
  if (!intervals.length) errors.push('Add at least one reminder interval.');

  const ccEmails = [];
  for (const value of Array.isArray(input?.ccEmails) ? input.ccEmails : []) {
    const email = String(value).trim();
    if (!email) continue;
    if (!EMAIL.test(email)) errors.push(`"${email}" is not a valid email address.`);
    else if (!ccEmails.includes(email)) ccEmails.push(email);
  }

  return {
    errors,
    settings: {
      reminderIntervals: intervals.sort((a, b) => b - a),
      emailRemindersEnabled: input?.emailRemindersEnabled !== false,
      deviceNotificationsEnabled: input?.deviceNotificationsEnabled !== false,
      ccEmails
    }
  };
}

/** Every outstanding deadline across grants and incomplete requirements. */
export function collectDeadlines(grants, requirements) {
  const deadlines = [];
  const grantById = new Map(grants.map((grant) => [grant.id, grant]));

  for (const grant of grants) {
    const pairs = [
      [DEADLINE_TYPES.application, grant.applicationDueDate],
      [DEADLINE_TYPES.acquittal, grant.acquittalDueDate],
      [DEADLINE_TYPES.renewal, grant.renewalDate || grant.renewal_date]
    ];
    for (const [deadlineType, value] of pairs) {
      const date = isoDay(value);
      if (!date) continue;
      deadlines.push({
        grant,
        requirement: null,
        deadlineType,
        deadlineDate: date,
        recipient: (grant.personInChargeEmail || '').trim(),
        personName: grant.personInCharge || ''
      });
    }
  }

  for (const requirement of requirements) {
    if (effectiveStatus(requirement) === 'Completed') continue;
    const grant = grantById.get(requirement.grantId || requirement.grant_id);
    if (!grant) continue;
    const date = isoDay(requirement.dueDate || requirement.due_date);
    if (!date) continue;
    deadlines.push({
      grant,
      requirement,
      deadlineType: DEADLINE_TYPES.requirement,
      deadlineDate: date,
      recipient: (requirement.personResponsibleEmail || grant.personInChargeEmail || '').trim(),
      personName: requirement.personResponsible || grant.personInCharge || ''
    });
  }

  return deadlines;
}

export const reminderKey = (item, interval, deliveryType) =>
  [item.grant.id, item.requirement?.id || 'grant', item.deadlineType, item.deadlineDate, interval, item.recipient.toLowerCase(), deliveryType].join('|');

/** Deadlines whose remaining days match a configured interval. */
export function dueReminders(deadlines, intervals, today = todayInSydney()) {
  const due = [];
  for (const item of deadlines) {
    const remaining = daysUntil(item.deadlineDate, today);
    if (remaining === null || remaining < 0) continue;
    if (!intervals.includes(remaining)) continue;
    due.push({ ...item, interval: remaining, remaining });
  }
  return due;
}

const remainingText = (days) => (days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`);

export function composeEmail(item) {
  const grantName = item.grant.grantName || item.grant.name || 'Grant';
  const greeting = item.personName ? `Hello ${item.personName.split(' ')[0]},` : 'Hello,';
  const subject = `Grant deadline reminder: ${grantName} — ${remainingText(item.remaining)} remaining`;
  const what = item.requirement ? 'grant requirement' : item.deadlineType.toLowerCase();
  const lines = [
    greeting,
    '',
    item.remaining === 0
      ? `This is a reminder that the following ${what} is due today.`
      : `This is a reminder that the following ${what} is due in ${remainingText(item.remaining)}.`,
    '',
    'Grant:',
    grantName
  ];
  if (item.requirement) lines.push('', 'Requirement:', item.requirement.title || 'Requirement');
  lines.push(
    '',
    'Due:',
    longDate(item.deadlineDate),
    '',
    "Please log in to Lou's Place Operations Hub for further details.",
    '',
    'If this action has already been completed, no further action is required.'
  );
  return { subject, body: lines.join('\n') };
}