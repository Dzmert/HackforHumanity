import { base44 } from '@/api/base44Client';

export const GRANT_STATUSES = [
  'Potential', 'Preparing', 'Submitted', 'Successful', 'Active',
  'Acquittal Due', 'Completed', 'Unsuccessful', 'Withdrawn'
];

export const REQUIREMENT_STATUSES = ['Not started', 'In progress', 'Completed'];

export const REQUIREMENT_TYPES = [
  'Funder update', 'Financial reconciliation', 'Participant statistics',
  'Outcome measurement', 'Acquittal', 'Evidence upload', 'Other'
];

export const isCaseworker = (user) => !!user && (user.role === 'caseworker' || user.role === 'admin');

/** Display helper: nulls, undefined and blanks show as "N/A". */
export const display = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string' && value.trim() === '') return 'N/A';
  return value;
};

export const displayAmount = (value) =>
  value === null || value === undefined || value === ''
    ? 'N/A'
    : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value));

export const grantName = (grant) => display(grant.grantName || grant.name);
export const grantFunder = (grant) => display(grant.funderName || grant.funder);
export const grantRenewal = (grant) => display(grant.renewalDate || grant.renewal_date);
export const requirementDueDate = (r) => display(r.dueDate || r.due_date);
export const requirementGrantId = (r) => r.grantId || r.grant_id;

export const effectiveStatus = (requirement) => {
  const stored = requirement.requirementStatus
    || (requirement.status === 'complete' ? 'Completed'
      : requirement.status === 'in_progress' ? 'In progress' : 'Not started');
  if (stored === 'Completed') return 'Completed';
  const due = requirement.dueDate || requirement.due_date;
  const today = new Date().toISOString().slice(0, 10);
  if (due && due < today) return 'Overdue';
  return stored;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Human readable validation errors keyed by field. */
export const validateGrant = (form) => {
  const errors = {};
  if (!String(form.grantName || '').trim()) errors.grantName = 'Grant name is required.';
  if (form.personInChargeEmail && !EMAIL.test(form.personInChargeEmail)) errors.personInChargeEmail = 'Enter a valid email address.';
  if (form.grantWebsite) {
    try { new URL(form.grantWebsite.startsWith('http') ? form.grantWebsite : 'https://' + form.grantWebsite); }
    catch { errors.grantWebsite = 'Enter a valid website address.'; }
  }
  if (form.grantAmount !== '' && form.grantAmount !== undefined && form.grantAmount !== null) {
    const amount = Number(form.grantAmount);
    if (Number.isNaN(amount)) errors.grantAmount = 'Amount must be a number.';
    else if (amount < 0) errors.grantAmount = 'Amount cannot be negative.';
  }
  if (form.fundingStartDate && form.fundingEndDate && form.fundingEndDate < form.fundingStartDate) {
    errors.fundingEndDate = 'Funding end date cannot be before the start date.';
  }
  return errors;
};

export const validateRequirement = (form) => {
  const errors = {};
  if (!String(form.title || '').trim()) errors.title = 'Title is required.';
  if (!form.dueDate) errors.dueDate = 'Due date is required.';
  if (form.personResponsibleEmail && !EMAIL.test(form.personResponsibleEmail)) errors.personResponsibleEmail = 'Enter a valid email address.';
  return errors;
};

const call = async (action, payload = {}) => {
  try {
    const response = await base44.functions.invoke('grants', { action, ...payload });
    return response.data;
  } catch (error) {
    // Surface the readable reason the grants function returned, not just the status code.
    const detail = error?.response?.data?.error;
    throw new Error(detail || error.message || 'Something went wrong.');
  }
};

export const grantsApi = {
  listGrants: () => call('listGrants'),
  getGrant: (id) => call('getGrant', { id }),
  createGrant: (data) => call('createGrant', { data }),
  updateGrant: (id, data) => call('updateGrant', { id, data }),
  deleteGrant: (id) => call('deleteGrant', { id }),
  listRequirements: (grantId) => call('listRequirements', { grantId }),
  listAudit: (grantId) => call('listAudit', { grantId }),
  createRequirement: (data) => call('createRequirement', { data }),
  updateRequirement: (id, data) => call('updateRequirement', { id, data }),
  deleteRequirement: (id) => call('deleteRequirement', { id }),
  completeRequirement: (id) => call('completeRequirement', { id }),
  reopenRequirement: (id) => call('reopenRequirement', { id }),
  parseSpreadsheet: (fileUrl) => call('parseSpreadsheet', { fileUrl }),
  listDocuments: (grantId) => call('listDocuments', { grantId }),
  createDocument: (data) => call('createDocument', { data }),
  deleteDocument: (id) => call('deleteDocument', { id }),
  getReminderSettings: () => call('getReminderSettings'),
  saveReminderSettings: (data) => call('saveReminderSettings', { data }),
  dueDeviceReminders: () => call('dueDeviceReminders'),
  logDeviceReminder: (data) => call('logDeviceReminder', { data }),
  // resend=true ignores the "already delivered" guard, for testing a real send.
  runReminderCheck: (resend = false) => call('runReminderCheck', { resend }),
  getPushConfig: () => call('getPushConfig'),
  savePushSubscription: (data) => call('savePushSubscription', { data }),
  removePushSubscription: (endpoint) => call('removePushSubscription', { endpoint }),
  sendTestPush: () => call('sendTestPush'),
  askAssistant: (question) => call('askAssistant', { question })
};