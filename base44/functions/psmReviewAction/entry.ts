import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * The two PSM review actions, run straight from the click:
 *  - confirm: logs that the note was reviewed and needs nothing further.
 *  - flag: logs it and tells the caseworker what to pick up, in her own inbox.
 * Flagging is a request for follow-up, not a judgement on her work.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'project_services_manager'].includes(user.role)) {
      return Response.json({ error: 'Only a project services manager or admin can review notes' }, { status: 403 });
    }
    const service = base44.asServiceRole;

    const { caseNoteId, action, followUpNote } = await req.json();
    if (!caseNoteId || !['confirm', 'flag'].includes(action)) {
      return Response.json({ error: 'A case note and an action of confirm or flag are required' }, { status: 400 });
    }
    const note = (await service.entities.CaseNote.filter({ id: caseNoteId }, '-created_date', 1))[0];
    if (!note) return Response.json({ error: 'Note not found' }, { status: 404 });

    const reviewer = user.full_name || user.email;
    const now = new Date().toISOString();

    if (action === 'confirm') {
      await service.entities.ActivityLog.create({
        module: 'documentation',
        action: 'psm_confirmed_note',
        subject_type: 'CaseNote',
        subject_id: note.id,
        actor_id: user.id,
        actor_name: reviewer,
        detail: `Reviewed — no further action needed. Client reference: ${note.client_reference || 'Not stated'}.`,
        occurred_at: now
      });
      return Response.json({ action: 'confirm', logged: true });
    }

    const detail = String(followUpNote || '').trim();
    if (!detail || detail.length > 1000) {
      return Response.json({ error: 'A short note is required to flag for follow-up' }, { status: 400 });
    }

    const author = (await service.entities.User.filter({ id: note.created_by_id }, '-created_date', 1))[0];
    const message = [
      `${reviewer} has asked for follow-up on a case note.`,
      '',
      `Client reference: ${note.client_reference || 'Not stated'}`,
      `Visit date: ${note.note_date}`,
      '',
      `What's needed: ${detail}`
    ].join('\n');

    await service.entities.Alert.create({
      module: 'documentation',
      title: `Follow-up requested — ${note.client_reference || 'case note'}`,
      message,
      priority: 'high',
      source_id: note.id
    });

    let emailed = false;
    if (author?.email) {
      await service.integrations.Core.SendEmail({
        to: author.email,
        from_name: "Lou's Place",
        subject: 'Follow-up requested on a case note',
        body: `Hello,\n\n${message}\n\nLou's Place operations hub`
      });
      emailed = true;
    }

    await service.entities.ActivityLog.create({
      module: 'documentation',
      action: 'psm_flagged_note',
      subject_type: 'CaseNote',
      subject_id: note.id,
      actor_id: user.id,
      actor_name: reviewer,
      detail,
      occurred_at: now
    });

    return Response.json({ action: 'flag', logged: true, emailed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}