// Fields every role may see.
const BASE_COLUMNS = [
  { field: 'name', label: 'Name' },
  { field: 'reference_code', label: 'Reference' },
  { field: 'pronouns', label: 'Pronouns' }
];

// Fields restricted to paid staff — hidden from volunteers wherever clients render.
const RESTRICTED_COLUMNS = [
  { field: 'preferred_contact_method', label: 'Preferred contact' },
  { field: 'assigned_caseworker', label: 'Caseworker' },
  { field: 'notes', label: 'Notes' }
];

export const canSeeRestrictedClientFields = (role) =>
  ['admin', 'caseworker', 'project_services_manager'].includes(role);

export function visibleClientColumns(role) {
  return canSeeRestrictedClientFields(role) ? [...BASE_COLUMNS, ...RESTRICTED_COLUMNS] : BASE_COLUMNS;
}