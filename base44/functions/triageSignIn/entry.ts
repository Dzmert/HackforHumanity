import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const AREAS = ['Domestic & Family Violence', 'Housing', 'Always Mum', 'General'];

/**
 * Door sign-in triage. Creates the sign-in, links or creates a client profile,
 * and takes ONE preliminary guess at the likely area from her own words.
 * The guess is labelled as a guess everywhere it is shown and is never written
 * onto a case note or treated as confirmed.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const name = String(body.clientName || '').trim();
    const reference = String(body.clientReference || '').trim();
    const reason = String(body.reasonForVisit || '').trim();
    if (!name) return Response.json({ error: 'A name or reference code is required' }, { status: 400 });
    if (!reason || reason.length > 600) {
      return Response.json({ error: 'A reason for visit is required, up to 600 characters' }, { status: 400 });
    }

    // Match on reference code first, then on name — never fuzzy, so we don't
    // silently attach one woman's visit to another woman's profile.
    const clients = await service.entities.Client.list('-created_date', 500);
    const lower = (value) => String(value || '').trim().toLowerCase();
    let client = reference ? clients.find(record => lower(record.reference_code) === lower(reference)) : null;
    if (!client) client = clients.find(record => lower(record.name) === lower(name));

    let isPlaceholder = false;
    if (!client) {
      isPlaceholder = true;
      client = await service.entities.Client.create({
        name,
        reference_code: reference || `SIGNIN-${Date.now()}`,
        notes: 'Placeholder profile created at sign-in. To be completed by a caseworker.'
      });
    }

    const guess = await service.integrations.Core.InvokeLLM({
      prompt: [
        "You are helping a trauma-informed women's service triage a walk-in at the door.",
        'Read only her stated reason for visit and suggest which area of support it MOST LIKELY relates to.',
        `Choose exactly one of: ${AREAS.join(', ')}. Use "General" whenever the words do not clearly point to one area.`,
        'This is a preliminary guess to help route her to the right person — not an assessment. Do not infer risk, do not speculate beyond her words, and do not add detail she did not give.',
        'For basis, quote only the words from her reason that led you there.',
        '',
        `Reason for visit: ${reason}`
      ].join('\n'),
      response_json_schema: {
        type: 'object',
        properties: {
          area: { type: 'string', enum: AREAS },
          basis: { type: 'string' }
        },
        required: ['area', 'basis']
      }
    });

    const inferred = AREAS.includes(guess?.area) ? guess.area : 'General';

    // Who is on shift right now, from the roster.
    const signInTime = new Date();
    const shifts = await service.entities.Shift.list('-start_time', 200);
    const onShift = shifts.find(shift =>
      shift.assigned_volunteer_id &&
      new Date(shift.start_time) <= signInTime &&
      new Date(shift.end_time) >= signInTime
    );
    let caseworker = null;
    if (onShift) {
      caseworker = (await service.entities.User.filter({ id: onShift.assigned_volunteer_id }, '-created_date', 1))[0];
    }
    const caseworkerSpecialisation = caseworker?.specialisation || '';
    const mismatch = Boolean(
      caseworkerSpecialisation && inferred !== 'General' && caseworkerSpecialisation !== inferred
    );

    const signIn = await service.entities.SignIn.create({
      client_name: name,
      client_reference: client.reference_code,
      client_id: client.id,
      is_placeholder_client: isPlaceholder,
      sign_in_time: signInTime.toISOString(),
      reason_for_visit: reason,
      inferred_specialisation: inferred,
      inference_basis: guess?.basis || '',
      inference_status: 'Preliminary guess',
      assigned_caseworker_id: onShift?.assigned_volunteer_id || '',
      assigned_caseworker_name: onShift?.assigned_volunteer_name || '',
      assigned_caseworker_specialisation: caseworkerSpecialisation,
      specialisation_mismatch: mismatch,
      status: 'waiting'
    });

    return Response.json({
      signIn,
      client: { id: client.id, name: client.name, reference_code: client.reference_code, is_placeholder: isPlaceholder },
      inferred,
      basis: guess?.basis || '',
      mismatch,
      caseworker_specialisation: caseworkerSpecialisation,
      caseworker_name: onShift?.assigned_volunteer_name || ''
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}