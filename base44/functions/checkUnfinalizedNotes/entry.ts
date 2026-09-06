import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { analyseNarrative } from '../../shared/caseNoteAnalysis.ts';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const formatTime = (iso) =>
  new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    // Drafts are notes that were started but never Marked Complete.
    const drafts = await service.entities.CaseNote.filter({ status: 'draft' }, '-updated_date', 200);
    const cutoff = Date.now() - TWO_HOURS_MS;
    const stale = drafts.filter(note => new Date(note.updated_date).getTime() < cutoff);

    if (!stale.length) return Response.json({ checked: drafts.length, notified: 0 });

    // One notification per note, ever — a repeat run must not re-raise the same one.
    const existing = await service.entities.Alert.filter({ module: 'documentation' }, '-created_date', 500);
    const alreadyRaised = new Set(existing.map(alert => alert.source_id));
    const pending = stale.filter(note => !alreadyRaised.has(note.id));

    const managers = (await service.entities.User.list('-created_date', 500))
      .filter(person => person.role === 'project_services_manager' || person.role === 'admin');

    let notified = 0;
    for (const note of pending) {
      // Rough internal read of the unfinished text, purely to spot possible risk.
      // It is never written onto the note — only the caseworker's own confirmed
      // review can do that.
      let urgent = false;
      try {
        const analysis = await analyseNarrative(base44, note.note || '');
        urgent = analysis?.safety_risk_level?.value === 'High';
      } catch (_analysisError) {
        urgent = false;
      }

      const author = note.created_by_id
        ? (await service.entities.User.filter({ id: note.created_by_id }, '-created_date', 1))[0]
        : null;
      const startedBy = author?.full_name || author?.email || 'a caseworker';

      const lines = [
        `Client reference: ${note.client_reference || 'Not stated'}`,
        `Started by: ${startedBy}`,
        `Last edited: ${formatTime(note.updated_date)}`,
        'This note has not been finalized yet.',
        '',
        urgent
          ? 'A rough automated read of the unfinished text suggests there may be a high safety risk here, so it may be worth someone looking sooner rather than later. That read is provisional and unconfirmed.'
          : 'This may need someone to follow up — the details may simply be waiting on a quiet moment to finish.'
      ];
      const message = lines.join('\n');

      await service.entities.Alert.create({
        module: 'documentation',
        title: urgent
          ? `Unfinished note may need attention — ${note.client_reference || 'client'}`
          : `Unfinished note may need follow-up — ${note.client_reference || 'client'}`,
        message,
        priority: urgent ? 'high' : 'medium',
        source_id: note.id
      });

      for (const manager of managers) {
        if (!manager.email) continue;
        await service.integrations.Core.SendEmail({
          to: manager.email,
          from_name: "Lou's Place",
          subject: (urgent ? '[May need attention] ' : '') + `A case note is still unfinished — ${note.client_reference || 'client'}`,
          body: `Hello,\n\nA case note was started and hasn't been finalized. It may need someone to follow up.\n\n${message}\n\nThis is a prompt to check in on the client's needs, not a comment on anyone's work.\n\nLou's Place operations hub`
        });
      }
      notified += 1;
    }

    return Response.json({ checked: drafts.length, stale: stale.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}