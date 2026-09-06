import { CASE_TAGS, PROVISIONAL_KEY_NEEDS, PROVISIONAL_NEXT_STEPS, PROVISIONAL_STRENGTHS } from './caseNoteFramework.ts';

// "Not stated" is the exact sentinel downstream gap-checks look for. Do not reword it.
export const NOT_STATED = 'Not stated';

const singleField = { type: 'object', properties: { value: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } } }, required: ['value', 'sources'] };
const listField = { type: 'object', properties: { values: { type: 'array', items: { type: 'string' } }, sources: { type: 'array', items: { type: 'string' } } }, required: ['values', 'sources'] };

export function buildAnalysisPrompt(narrative) {
  return [
    'You are analysing a case note written by a caseworker at Lou\'s Place, a women\'s support service in Sydney.',
    'Caseworkers write in wildly inconsistent styles: dot points, clinical shorthand, or long prose. Handle all of them.',
    '',
    'Extract the fields in the response schema. Rules you must not break:',
    `1. If the narrative contains no textual basis for a field, set its value to exactly "${NOT_STATED}" (or an empty values array for list fields) and return an empty sources array. NEVER infer, guess, or fill a field from general likelihood.`,
    '2. For every field you DO populate, "sources" must contain the exact sentence or sentences from the narrative, copied verbatim character-for-character, that the value came from. Do not paraphrase, trim, or reconstruct them — they are used to highlight the original text.',
    '3. Use trauma-informed, strengths-based, non-judgemental language in anything you word yourself.',
    '',
    `Case Tags: choose any that the content supports, from exactly this list: ${CASE_TAGS.join(', ')}. A note may carry several. "Always Mum" is Lou's Place's parenting/mothering support stream and is a tag in its own right — never fold it into "General Drop-In". Use "General Drop-In" only for a casual visit with no other identifiable focus.`,
    '',
    'Safety Risk Level must be Low, Medium or High. AVO Status must be None, Interim or Final. Perpetrator Occupancy Status must be "Still at shared address", "Removed" or "Unknown". Risk of Homelessness must be Low, Medium or High. Every one of these still returns "' + NOT_STATED + '" when the narrative does not support a value.',
    '',
    `Key Needs, Strengths and Next Steps: prefer wording from these categories where the narrative genuinely matches one, otherwise describe what the narrative actually says. Key Needs categories: ${PROVISIONAL_KEY_NEEDS.join(', ')}. Strengths categories: ${PROVISIONAL_STRENGTHS.join(', ')}. Next Steps categories: ${PROVISIONAL_NEXT_STEPS.join(', ')}.`,
    '',
    'NARRATIVE:',
    String(narrative)
  ].join('\n');
}

export const analysisSchema = {
  type: 'object',
  properties: {
    case_tags: listField,
    safety_risk_level: singleField,
    avo_status: singleField,
    relationship_to_perpetrator: singleField,
    perpetrator_occupancy_status: singleField,
    current_temporary_accommodation: singleField,
    tenancy_address: singleField,
    tenancy_start_date: singleField,
    risk_of_homelessness: singleField,
    preferred_relocation_area: singleField,
    bedrooms_needed: singleField,
    number_of_dependent_children: singleField,
    childrens_ages: singleField,
    key_needs: listField,
    strengths: listField,
    next_steps: listField
  },
  required: [
    'case_tags', 'safety_risk_level', 'avo_status', 'relationship_to_perpetrator',
    'perpetrator_occupancy_status', 'current_temporary_accommodation', 'tenancy_address',
    'tenancy_start_date', 'risk_of_homelessness', 'preferred_relocation_area', 'bedrooms_needed',
    'number_of_dependent_children', 'childrens_ages', 'key_needs', 'strengths', 'next_steps'
  ]
};

/** Runs the same extraction the caseworker review screen uses. */
export async function analyseNarrative(base44, narrative) {
  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: buildAnalysisPrompt(narrative),
    response_json_schema: analysisSchema
  });
}