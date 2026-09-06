import { GRANT_STATUSES } from '@/lib/grants';

export const IMPORT_FIELDS = [
  ['grantName', 'Grant name'],
  ['funderName', 'Funder name'],
  ['grantAmount', 'Grant amount'],
  ['grantType', 'Grant type'],
  ['grantStatus', 'Grant status'],
  ['applicationDueDate', 'Application due date'],
  ['fundingStartDate', 'Funding start date'],
  ['fundingEndDate', 'Funding end date'],
  ['acquittalType', 'Acquittal type'],
  ['acquittalDueDate', 'Acquittal due date'],
  ['renewalDate', 'Renewal date'],
  ['grantWebsite', 'Grant website'],
  ['grantReferenceNumber', 'Grant reference number'],
  ['personInCharge', 'Person in charge'],
  ['personInChargeEmail', 'Person in charge email'],
  ['grantPurpose', 'Grant purpose'],
  ['additionalNotes', 'Additional notes']
];

export const FIELD_LABELS = Object.fromEntries(IMPORT_FIELDS);

const DATE_FIELDS = ['applicationDueDate', 'fundingStartDate', 'fundingEndDate', 'acquittalDueDate', 'renewalDate'];

// Tolerant header aliases. Compared after lowercasing and stripping non-letters.
const ALIASES = {
  grantName: ['grant', 'grantname', 'name', 'fundingname', 'grants', 'projectname', 'grantttitle', 'granttitle', 'title', 'programname'],
  funderName: ['funder', 'fundername', 'funding body', 'fundingbody', 'funderorganisation', 'funderorganization', 'grantor', 'donor', 'source', 'fundingsource'],
  grantAmount: ['amount', 'grantamount', 'grantvalue', 'fundingamount', 'value', 'requestedamount', 'awardedamount', 'total', 'totalamount', 'aud', 'amountaud'],
  grantType: ['type', 'granttype', 'category', 'grantcategory', 'fundingtype'],
  grantStatus: ['status', 'grantstatus', 'stage', 'progress', 'currentstatus'],
  applicationDueDate: ['closingdate', 'applicationdeadline', 'applicationdue', 'duedate', 'applicationduedate', 'deadline', 'closes', 'submissiondate', 'submissiondeadline'],
  fundingStartDate: ['fundingstart', 'fundingstartdate', 'startdate', 'start', 'commencementdate', 'periodstart'],
  fundingEndDate: ['fundingend', 'fundingenddate', 'enddate', 'end', 'completiondate', 'periodend', 'finishdate'],
  acquittalType: ['acquittaltype', 'acquittal', 'reportingtype', 'reportrequired', 'acquittalrequirement'],
  acquittalDueDate: ['acquittalduedate', 'acquittaldue', 'acquittaldeadline', 'reportdue', 'reportduedate', 'acquittaldate'],
  renewalDate: ['renewaldate', 'renewal', 'nextrenewal', 'reapplydate', 'renewsdue', 'renewaldue'],
  grantWebsite: ['website', 'grantwebsite', 'url', 'link', 'weblink', 'grantlink', 'applicationlink'],
  grantReferenceNumber: ['reference', 'referencenumber', 'grantreference', 'grantreferencenumber', 'refno', 'ref', 'grantid', 'applicationnumber', 'agreementnumber'],
  personInCharge: ['personincharge', 'owner', 'responsible', 'responsibleperson', 'leadstaff', 'contact', 'contactperson', 'assignedto', 'staffmember'],
  personInChargeEmail: ['email', 'personinchargeemail', 'contactemail', 'owneremail', 'responsibleemail', 'emailaddress'],
  grantPurpose: ['purpose', 'grantpurpose', 'description', 'projectdescription', 'projectpurpose', 'about', 'scope'],
  additionalNotes: ['notes', 'additionalnotes', 'comments', 'comment', 'remarks', 'othernotes']
};

const key = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');

/** Suggests { header: field } mappings; each field is used at most once. */
export function suggestMapping(headers) {
  const mapping = {};
  const used = new Set();
  const match = (header, strict) => {
    const normalised = key(header);
    if (!normalised) return null;
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (used.has(field)) continue;
      const list = aliases.map(key).concat(key(field));
      if (list.includes(normalised)) return field;
      if (!strict && list.some(alias => alias.length > 3 && (normalised.includes(alias) || alias.includes(normalised)))) return field;
    }
    return null;
  };

  for (const strict of [true, false]) {
    headers.forEach(header => {
      if (mapping[header]) return;
      const field = match(header, strict);
      if (field) { mapping[header] = field; used.add(field); }
    });
  }
  return mapping;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Accepts ISO, D/M/YYYY, D-M-YYYY, "12 March 2026" and Excel serial numbers. Returns YYYY-MM-DD or null. */
export function parseDate(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (/^\d{5}(\.\d+)?$/.test(value)) {
    return new Date(EXCEL_EPOCH + Number(value) * 86400000).toISOString().slice(0, 10);
  }
  const parts = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]);
    let year = Number(parts[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /[a-z]/i.test(value)) return parsed.toISOString().slice(0, 10);
  return undefined;
}

export function parseAmount(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const numeric = Number(value.replace(/[$,\s]/g, '').replace(/\((.*)\)/, '-$1'));
  if (Number.isNaN(numeric)) return undefined;
  return numeric;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const matchStatus = (raw) => {
  const normalised = key(raw);
  if (!normalised) return null;
  return GRANT_STATUSES.find(status => key(status) === normalised)
    || GRANT_STATUSES.find(status => key(status).includes(normalised) || normalised.includes(key(status)))
    || undefined;
};

/** Converts one spreadsheet row into { values, errors, warnings }. */
export function buildRow(headers, cells, mapping) {
  const values = {};
  const errors = [];
  const warnings = [];

  headers.forEach((header, index) => {
    const field = mapping[header];
    if (!field) return;
    const raw = cells[index];
    if (field === 'grantAmount') {
      const amount = parseAmount(raw);
      if (amount === undefined) errors.push(`${FIELD_LABELS[field]}: "${raw}" is not a valid amount.`);
      else if (amount !== null && amount < 0) errors.push(`${FIELD_LABELS[field]} cannot be negative.`);
      else values[field] = amount;
      return;
    }
    if (DATE_FIELDS.includes(field)) {
      const date = parseDate(raw);
      if (date === undefined) errors.push(`${FIELD_LABELS[field]}: "${raw}" is not a date we recognise.`);
      else values[field] = date;
      return;
    }
    if (field === 'grantStatus') {
      const status = matchStatus(raw);
      if (status === undefined) {
        warnings.push(`Grant status "${raw}" is not recognised, importing as Potential.`);
        values[field] = 'Potential';
      } else values[field] = status || null;
      return;
    }
    const text = String(raw ?? '').trim();
    if (field === 'personInChargeEmail' && text && !EMAIL.test(text)) {
      errors.push(`Person in charge email "${text}" is not a valid email address.`);
      return;
    }
    if (field === 'grantWebsite' && text) {
      try { new URL(text.startsWith('http') ? text : `https://${text}`); }
      catch { errors.push(`Grant website "${text}" is not a valid address.`); return; }
    }
    values[field] = text === '' ? null : text;
  });

  if (!values.grantName) errors.push('Grant name is required.');
  if (!values.grantStatus) values.grantStatus = 'Potential';
  if (values.fundingStartDate && values.fundingEndDate && values.fundingEndDate < values.fundingStartDate) {
    errors.push('Funding end date is before the funding start date.');
  }
  return { values, errors, warnings };
}

/** Finds an existing grant that this imported row probably already represents. */
export function findDuplicate(values, grants) {
  const reference = key(values.grantReferenceNumber);
  if (reference) {
    const byReference = grants.find(grant => key(grant.grantReferenceNumber) === reference);
    if (byReference) return { grant: byReference, reason: 'Same grant reference number' };
  }
  const name = key(values.grantName);
  if (!name) return null;
  const sameName = grants.filter(grant => key(grant.grantName || grant.name) === name);
  if (!sameName.length) return null;
  const funder = key(values.funderName);
  const byFunder = funder ? sameName.find(grant => key(grant.funderName || grant.funder) === funder) : null;
  if (byFunder) return { grant: byFunder, reason: 'Same grant name and funder' };
  const byDate = values.applicationDueDate
    ? sameName.find(grant => grant.applicationDueDate === values.applicationDueDate)
    : null;
  if (byDate) return { grant: byDate, reason: 'Same grant name and application due date' };
  return { grant: sameName[0], reason: 'Same grant name' };
}

/** For updates: never blank out an existing value with an empty imported cell. */
export function mergeForUpdate(values, existing) {
  const merged = {};
  for (const [field] of IMPORT_FIELDS) {
    if (!(field in values)) continue;
    const value = values[field];
    const isBlank = value === null || value === '';
    if (isBlank && existing[field] !== null && existing[field] !== undefined && existing[field] !== '') continue;
    merged[field] = value;
  }
  return merged;
}