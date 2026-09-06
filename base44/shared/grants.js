// Shared grant/compliance domain rules used by backend functions.

export const GRANT_STATUSES = [
  'Potential', 'Preparing', 'Submitted', 'Successful', 'Active',
  'Acquittal Due', 'Completed', 'Unsuccessful', 'Withdrawn'
];

export const REQUIREMENT_STATUSES = ['Not started', 'In progress', 'Completed'];
export const OVERDUE = 'Overdue';

const GRANT_FIELDS = [
  'grantName', 'funderName', 'grantAmount', 'grantType', 'grantStatus',
  'applicationDueDate', 'fundingStartDate', 'fundingEndDate', 'acquittalType',
  'acquittalDueDate', 'renewalDate', 'grantWebsite', 'grantReferenceNumber',
  'personInCharge', 'personInChargeEmail', 'grantPurpose', 'additionalNotes'
];

const REQUIREMENT_FIELDS = [
  'grantId', 'title', 'description', 'requirementType', 'dueDate',
  'personResponsible', 'personResponsibleEmail', 'requirementStatus',
  'completionDate', 'notes'
];

// Never persist the literal "N/A" — empty values are stored as null.
function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toUpperCase() === 'N/A') return null;
    return trimmed;
  }
  return value;
}

function pick(input, fields) {
  const out = {};
  for (const field of fields) {
    if (field in input) out[field] = clean(input[field]);
  }
  return out;
}

export function isCaseworker(user) {
  return !!user && (user.role === 'caseworker' || user.role === 'admin');
}

export function normaliseGrant(input) {
  const data = pick(input || {}, GRANT_FIELDS);
  if (!data.grantName && 'grantName' in data) throw new Error('grantName is required');
  if ('grantAmount' in data) {
    const amount = data.grantAmount === null ? null : Number(data.grantAmount);
    if (amount !== null && Number.isNaN(amount)) throw new Error('grantAmount must be numeric');
    data.grantAmount = amount;
  }
  if (data.grantStatus && !GRANT_STATUSES.includes(data.grantStatus)) {
    throw new Error('Unsupported grant status: ' + data.grantStatus);
  }
  // Keep the legacy display fields in step so existing views keep working.
  if (data.grantName) data.name = data.grantName;
  if (data.funderName) data.funder = data.funderName;
  if ('grantAmount' in data) data.amount = data.grantAmount || 0;
  if (data.renewalDate) data.renewal_date = data.renewalDate;
  if ('additionalNotes' in data) data.notes = data.additionalNotes;
  return data;
}

// The stored schema still requires the original name/funder/renewal_date fields,
// so a create must always supply them from the canonical values.
export function normaliseGrantForCreate(input) {
  const data = normaliseGrant(input);
  if (!data.grantName) throw new Error('grantName is required');
  data.name = data.grantName;
  data.funder = data.funderName || data.grantName;
  data.renewal_date = data.renewalDate || data.fundingEndDate || data.applicationDueDate
    || new Date().toISOString().slice(0, 10);
  if (!data.grantStatus) data.grantStatus = 'Potential';
  return data;
}

export function normaliseRequirementForCreate(input) {
  const data = normaliseRequirement(input);
  if (!data.title) throw new Error('title is required');
  if (!data.grantId) throw new Error('grantId is required');
  data.grant_id = data.grantId;
  data.due_date = data.dueDate || new Date().toISOString().slice(0, 10);
  if (!data.requirementStatus) {
    data.requirementStatus = 'Not started';
    data.status = 'not_started';
  }
  return data;
}

export function normaliseRequirement(input) {
  const data = pick(input || {}, REQUIREMENT_FIELDS);
  if (data.requirementStatus && !REQUIREMENT_STATUSES.includes(data.requirementStatus)) {
    throw new Error('Unsupported requirement status: ' + data.requirementStatus);
  }
  if (data.requirementStatus === 'Completed' && !data.completionDate) {
    data.completionDate = new Date().toISOString().slice(0, 10);
  }
  if (data.requirementStatus && data.requirementStatus !== 'Completed') {
    data.completionDate = null;
  }
  if (data.grantId) data.grant_id = data.grantId;
  if (data.title) data.title = data.title;
  if (data.dueDate) data.due_date = data.dueDate;
  if (data.requirementStatus) {
    data.status = data.requirementStatus === 'Completed'
      ? 'complete'
      : data.requirementStatus === 'In progress' ? 'in_progress' : 'not_started';
  }
  return data;
}

// Overdue is derived, never stored.
export function effectiveStatus(requirement, now = new Date()) {
  const stored = requirement.requirementStatus
    || (requirement.status === 'complete' ? 'Completed'
      : requirement.status === 'in_progress' ? 'In progress' : 'Not started');
  if (stored === 'Completed') return 'Completed';
  const due = requirement.dueDate || requirement.due_date;
  if (due && new Date(due) < new Date(now.toISOString().slice(0, 10))) return OVERDUE;
  return stored;
}

const FIELD_LABELS = {
  grantName: 'Grant Name', funderName: 'Funder', grantAmount: 'Grant Amount', grantType: 'Grant Type',
  grantStatus: 'Grant Status', applicationDueDate: 'Application Due Date', fundingStartDate: 'Funding Start Date',
  fundingEndDate: 'Funding End Date', acquittalType: 'Acquittal Type', acquittalDueDate: 'Acquittal Due Date',
  renewalDate: 'Renewal Date', grantWebsite: 'Grant Website', grantReferenceNumber: 'Grant Reference Number',
  personInCharge: 'Person in Charge', personInChargeEmail: 'Person in Charge Email',
  grantPurpose: 'Grant Purpose', additionalNotes: 'Additional Notes'
};

/** Lightweight change list for the audit trail. */
export function diffGrant(before, after) {
  const changes = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (!(field in after)) continue;
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (String(from ?? '') === String(to ?? '')) continue;
    changes.push({ summary: 'changed ' + label, previousValue: from === null ? '' : String(from), newValue: to === null ? '' : String(to) });
  }
  return changes;
}

export function withEffectiveStatus(requirements) {
  return requirements.map(r => ({ ...r, effectiveStatus: effectiveStatus(r) }));
}