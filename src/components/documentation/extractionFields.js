// The exact sentinel downstream gap-checks look for. Do not reword it.
export const NOT_STATED = 'Not stated';

export const CASE_TAGS = ['Housing', 'Domestic & Family Violence', 'Always Mum', 'Referral', 'General Drop-In'];

const LEVELS = ['Low', 'Medium', 'High'];

/** Field definitions drive both the review screen and the commit payload. */
export const EXTRACTION_FIELDS = [
  { key: 'case_tags', label: 'Case Tags', type: 'tags', options: CASE_TAGS },
  { key: 'safety_risk_level', label: 'Safety Risk Level', type: 'choice', options: LEVELS, enumOnly: true },
  { key: 'avo_status', label: 'AVO Status', type: 'choice', options: ['None', 'Interim', 'Final'], enumOnly: true },
  { key: 'relationship_to_perpetrator', label: 'Relationship to Perpetrator', type: 'text' },
  { key: 'perpetrator_occupancy_status', label: 'Perpetrator Occupancy Status', type: 'choice', options: ['Still at shared address', 'Removed', 'Unknown'], enumOnly: true },
  { key: 'current_temporary_accommodation', label: 'Current Temporary Accommodation', type: 'text' },
  { key: 'tenancy_address', label: 'Tenancy Address', type: 'text' },
  { key: 'tenancy_start_date', label: 'Tenancy Start Date', type: 'text' },
  { key: 'risk_of_homelessness', label: 'Risk of Homelessness', type: 'choice', options: LEVELS },
  { key: 'preferred_relocation_area', label: 'Preferred Relocation Area', type: 'text' },
  { key: 'bedrooms_needed', label: 'Bedrooms Needed', type: 'text' },
  { key: 'number_of_dependent_children', label: 'Number of Dependent Children', type: 'text' },
  { key: 'childrens_ages', label: "Children's Ages", type: 'text' },
  { key: 'key_needs', label: 'Key Needs', type: 'list' },
  { key: 'strengths', label: 'Strengths', type: 'list' },
  { key: 'next_steps', label: 'Next Steps', type: 'list' }
];

/** Turns the raw analysis response into editable state: { values, sources }. */
export function normalizeExtraction(raw) {
  const values = {};
  const sources = {};
  EXTRACTION_FIELDS.forEach(field => {
    const entry = raw?.[field.key] || {};
    sources[field.key] = Array.isArray(entry.sources) ? entry.sources.filter(Boolean) : [];
    if (field.type === 'list' || field.type === 'tags') {
      values[field.key] = Array.isArray(entry.values) ? entry.values.filter(Boolean) : [];
    } else {
      values[field.key] = entry.value ? String(entry.value) : NOT_STATED;
    }
  });
  return { values, sources };
}

export const isStated = (field, value) =>
  field.type === 'list' || field.type === 'tags' ? value.length > 0 : Boolean(value) && value !== NOT_STATED;

/** Builds the CaseNote fields committed by Confirm & Finalize. */
export function buildExtractionPayload(values, sources) {
  const payload = { extraction_sources: sources };
  EXTRACTION_FIELDS.forEach(field => {
    const value = values[field.key];
    if (field.type === 'list' || field.type === 'tags') {
      payload[field.key] = value;
    } else if (field.enumOnly && !isStated(field, value)) {
      // These entity fields are enum-constrained and cannot hold "Not stated" — leave them unset.
    } else {
      payload[field.key] = value;
    }
  });
  // Prompt 0: a DV tag makes the note Sensitive.
  payload.visibility = values.case_tags?.includes('Domestic & Family Violence') ? 'Sensitive' : 'Standard';
  return payload;
}