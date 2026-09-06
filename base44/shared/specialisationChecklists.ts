// ============================================================================
// PROVISIONAL PLACEHOLDER — NOT Lou's Place's real specialist checklists.
//
// These items were invented so coverage tracking is demonstrable. They MUST be
// replaced with the checklists Lou's Place's own specialists author (same status
// as the letter template and the next-steps framework). Once specialists author
// SpecialisationChecklistItem records for a specialisation, those records win and
// this list is ignored for it.
//
// A checklist item is "covered" when every CaseNote field in `fields` has been
// stated on at least one of the client's complete notes — a baseline signal that
// the topic was discussed, never a judgement that it was handled well.
// ============================================================================

export const SPECIALISATIONS = ['Domestic & Family Violence', 'Housing', 'Always Mum'];

export const PROVISIONAL_CHECKLISTS = {
  'Domestic & Family Violence': [
    { key: 'safety_risk', label: 'Safety risk discussed', fields: ['safety_risk_level'] },
    { key: 'avo', label: 'AVO status established', fields: ['avo_status'] },
    { key: 'perpetrator', label: 'Perpetrator whereabouts and relationship established', fields: ['perpetrator_occupancy_status', 'relationship_to_perpetrator'] },
    { key: 'where_staying', label: 'Where she is staying tonight established', fields: ['current_temporary_accommodation'] },
    { key: 'next_steps', label: 'Next steps agreed with her', fields: ['next_steps'] }
  ],
  'Housing': [
    { key: 'tenancy', label: 'Current tenancy details established', fields: ['tenancy_address', 'tenancy_start_date'] },
    { key: 'homelessness_risk', label: 'Risk of homelessness discussed', fields: ['risk_of_homelessness'] },
    { key: 'relocation', label: 'Preferred area and size of home discussed', fields: ['preferred_relocation_area', 'bedrooms_needed'] },
    { key: 'housing_next_steps', label: 'Housing next steps agreed with her', fields: ['next_steps'] }
  ],
  'Always Mum': [
    { key: 'children', label: 'Children and their ages recorded', fields: ['number_of_dependent_children', 'childrens_ages'] },
    { key: 'parenting_needs', label: 'Parenting support needs discussed', fields: ['key_needs'] },
    { key: 'parenting_strengths', label: 'Her strengths as a mother recognised', fields: ['strengths'] }
  ]
};

const NOT_STATED = 'Not stated';

/** A field counts as stated only when the caseworker's confirmed note actually carries it. */
export function isFieldStated(note, field) {
  const value = note?.[field];
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value) && value !== NOT_STATED;
}

/** Specialisation tags carried anywhere in the client's history. */
export function clientSpecialisations(notes) {
  const tags = new Set();
  notes.forEach(note => (note.case_tags || []).forEach(tag => {
    if (SPECIALISATIONS.includes(tag)) tags.add(tag);
  }));
  return [...tags];
}

/**
 * Builds checklists from specialist-authored records where they exist, falling
 * back to the provisional list per specialisation.
 */
export function resolveChecklists(specialisations, authored) {
  const result = {};
  specialisations.forEach(specialisation => {
    const items = authored
      .filter(record => record.specialisation === specialisation && record.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(record => ({ key: record.item_key, label: record.item_label, fields: record.satisfied_by_fields || [] }));
    result[specialisation] = items.length ? items : (PROVISIONAL_CHECKLISTS[specialisation] || []);
  });
  return result;
}

/**
 * Evaluates one checklist item across every complete note for the client and
 * returns the earliest note that completed it, so credit lands with the visit
 * where it was actually established.
 */
export function evaluateItem(item, notes) {
  const ordered = [...notes].sort((a, b) => String(a.note_date).localeCompare(String(b.note_date)));
  const outstanding = new Set(item.fields);
  for (const note of ordered) {
    item.fields.forEach(field => { if (isFieldStated(note, field)) outstanding.delete(field); });
    if (!outstanding.size) return { covered: true, note };
  }
  return { covered: false, note: null };
}