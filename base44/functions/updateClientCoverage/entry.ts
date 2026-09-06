import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { clientSpecialisations, evaluateItem, resolveChecklists } from '../../shared/specialisationChecklists.ts';

/**
 * Recomputes a client's specialisation coverage after a note is finalized, and
 * raises a cross-specialisation notification when the caseworker who wrote it
 * works outside a specialisation the client needs and items remain outstanding.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const { caseNoteId } = await req.json();
    if (!caseNoteId) return Response.json({ error: 'caseNoteId is required' }, { status: 400 });

    const note = (await service.entities.CaseNote.filter({ id: caseNoteId }, '-created_date', 1))[0];
    if (!note || !note.client_id) return Response.json({ error: 'Note not found, or it has no client' }, { status: 404 });

    // Coverage is a client-level, whole-history picture — every complete note counts.
    const notes = await service.entities.CaseNote.filter({ client_id: note.client_id, status: 'complete' }, '-note_date', 200);
    const specialisations = clientSpecialisations(notes);
    if (!specialisations.length) return Response.json({ specialisations: [], outstanding: {} });

    const authored = await service.entities.SpecialisationChecklistItem.list('-created_date', 300);
    const checklists = resolveChecklists(specialisations, authored);

    const existing = await service.entities.ClientCoverage.filter({ client_id: note.client_id }, '-created_date', 500);
    const authors = {};
    const authorName = async (id) => {
      if (!id) return 'a caseworker';
      if (!authors[id]) {
        const found = (await service.entities.User.filter({ id }, '-created_date', 1))[0];
        authors[id] = found?.full_name || found?.email || 'a caseworker';
      }
      return authors[id];
    };

    const outstanding = {};
    for (const specialisation of specialisations) {
      outstanding[specialisation] = [];
      for (const item of checklists[specialisation]) {
        const result = evaluateItem(item, notes);
        const record = existing.find(entry => entry.specialisation === specialisation && entry.item_key === item.key);
        const payload = {
          client_id: note.client_id,
          specialisation,
          item_key: item.key,
          item_label: item.label,
          status: result.covered ? 'Covered' : 'Not yet covered',
          covered_date: result.covered ? result.note.note_date : '',
          covered_by_name: result.covered ? await authorName(result.note.created_by_id) : '',
          source_case_note_id: result.covered ? result.note.id : ''
        };
        // Coverage accumulates: an element already established stays established.
        if (!record) await service.entities.ClientCoverage.create(payload);
        else if (record.status !== 'Covered' && result.covered) await service.entities.ClientCoverage.update(record.id, payload);
        else if (record.item_label !== item.label) await service.entities.ClientCoverage.update(record.id, { item_label: item.label });

        if (!result.covered) outstanding[specialisation].push(item.label);
      }
    }

    // Cross-specialisation follow-up: the note's author works in a different area
    // to something this client needs, and that area still has gaps.
    const writer = (await service.entities.User.filter({ id: note.created_by_id }, '-created_date', 1))[0];
    const writerName = writer?.full_name || writer?.email || 'a caseworker';
    const staff = await service.entities.User.list('-created_date', 500);
    const escalations = [];

    for (const specialisation of specialisations) {
      if (!outstanding[specialisation].length) continue;
      if (writer?.specialisation === specialisation) continue;
      const items = outstanding[specialisation].join(', ');
      const message = [
        `A client with ${specialisation} needs was seen by ${writerName}, outside their specialisation — coverage still outstanding on: ${items}.`,
        '',
        `Client reference: ${note.client_reference || 'Not stated'}`,
        `Most recent visit: ${note.note_date}`,
        '',
        'This is a baseline prompt, not a compliance check: it flags where your specialist input may add something, and is no substitute for a direct conversation with the caseworker who saw her.'
      ].join('\n');

      await service.entities.Alert.create({
        module: 'documentation',
        title: `${specialisation} input may help — ${note.client_reference || 'client'}`,
        message,
        priority: 'medium',
        source_id: `${note.client_id}:${specialisation}:${note.id}`
      });

      const specialists = staff.filter(person => person.specialisation === specialisation && person.email);
      for (const specialist of specialists) {
        await service.integrations.Core.SendEmail({
          to: specialist.email,
          from_name: "Lou's Place",
          subject: `${specialisation}: a client may need your input`,
          body: `Hello,\n\n${message}\n\nLou's Place operations hub`
        });
      }
      escalations.push({ specialisation, items: outstanding[specialisation], notified: specialists.length });
    }

    return Response.json({ specialisations, outstanding, escalations });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}