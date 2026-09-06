// ============================================================================
// PROVISIONAL default document sets — what DCJ Housing and refuge services
// commonly ask for. Confirm with Lou's Place before relying on them; every item
// stays removable, and caseworkers can add anything missing.
// ============================================================================

export const DOC_STATUSES = ['Have', 'Requested', 'Not applicable', 'Not yet asked'];

export const RECIPIENT_TYPES = [
  'DCJ Housing',
  'Refuge/Accommodation Service',
  'Medical Provider/General Referral'
];

const RECIPIENT_DEFAULTS = {
  'DCJ Housing': [
    'AVO copy',
    'Statutory declaration',
    'Refuge/accommodation supporting letter',
    'GP/medical letter',
    'Housing Application form',
    'Transfer/mutual exchange supplement',
    'Medical assessment'
  ],
  'Refuge/Accommodation Service': ['AVO copy', 'Statutory declaration', 'Medical assessment'],
  'Medical Provider/General Referral': []
};

const LETTER_TYPE_DEFAULTS = {
  domestic_violence: ['AVO copy (if applicable)', 'Statutory declaration']
};

/** Union of the recipient set and the letter-type set, in order, without duplicates. */
export function defaultDocuments(letterType, recipientType) {
  const items = [...(RECIPIENT_DEFAULTS[recipientType] || []), ...(LETTER_TYPE_DEFAULTS[letterType] || [])];
  return items.filter((label, index) => items.indexOf(label) === index);
}