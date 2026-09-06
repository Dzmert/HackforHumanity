import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import * as XLSX from 'npm:xlsx@0.18.5';
import { secrets } from 'base44:runtime';
import { sendPush, vapidFrom } from '../../shared/webPush.js';
import {
  isCaseworker,
  normaliseGrant,
  normaliseGrantForCreate,
  normaliseRequirement,
  normaliseRequirementForCreate,
  withEffectiveStatus,
  diffGrant
} from '../../shared/grants.js';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  collectDeadlines,
  dueReminders,
  reminderKey,
  composeEmail
} from '../../shared/grantReminders.js';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isCaseworker(user)) {
      return Response.json({ error: 'Grants are available to caseworkers only' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;
    const id = body.id;
    const stamp = { updatedBy: user.email };
    const actorName = user.full_name || user.email;
    const logAudit = async (grantId, entries) => {
      for (const entry of entries) {
        await base44.asServiceRole.entities.GrantAuditEntry.create({ grantId, actorName, ...entry });
      }
    };

    if (action === 'listGrants') {
      const grants = await base44.asServiceRole.entities.Grant.list('-created_date', 200);
      return Response.json({ grants });
    }

    if (action === 'getGrant') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const grant = await base44.asServiceRole.entities.Grant.get(id);
      const requirements = await base44.asServiceRole.entities.GrantRequirement.list('-created_date', 500);
      const own = requirements.filter((r) => (r.grantId || r.grant_id) === id);
      const audit = await base44.asServiceRole.entities.GrantAuditEntry.filter({ grantId: id }, '-created_date', 25);
      return Response.json({ grant, requirements: withEffectiveStatus(own), audit });
    }

    if (action === 'createGrant') {
      const data = normaliseGrantForCreate(body.data);
      const grant = await base44.asServiceRole.entities.Grant.create({
        ...data,
        createdBy: user.email,
        updatedBy: user.email
      });
      await logAudit(grant.id, [{ summary: 'created this grant', previousValue: '', newValue: grant.grantName || '' }]);
      return Response.json({ grant });
    }

    if (action === 'updateGrant') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const before = await base44.asServiceRole.entities.Grant.get(id);
      const changes = normaliseGrant(body.data);
      const grant = await base44.asServiceRole.entities.Grant.update(id, { ...changes, ...stamp });
      await logAudit(id, diffGrant(before, changes));
      return Response.json({ grant });
    }

    if (action === 'deleteGrant') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const requirements = await base44.asServiceRole.entities.GrantRequirement.list('-created_date', 500);
      for (const r of requirements.filter((x) => (x.grantId || x.grant_id) === id)) {
        await base44.asServiceRole.entities.GrantRequirement.delete(r.id);
      }
      await base44.asServiceRole.entities.Grant.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === 'listRequirements') {
      const all = await base44.asServiceRole.entities.GrantRequirement.list('-created_date', 500);
      const scoped = body.grantId ? all.filter((r) => (r.grantId || r.grant_id) === body.grantId) : all;
      return Response.json({ requirements: withEffectiveStatus(scoped) });
    }

    if (action === 'createRequirement') {
      const data = normaliseRequirementForCreate(body.data);
      const requirement = await base44.asServiceRole.entities.GrantRequirement.create({
        ...data,
        createdBy: user.email,
        updatedBy: user.email
      });
      return Response.json({ requirement });
    }

    if (action === 'updateRequirement') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const requirement = await base44.asServiceRole.entities.GrantRequirement.update(id, {
        ...normaliseRequirement(body.data),
        ...stamp
      });
      return Response.json({ requirement });
    }

    if (action === 'listAudit') {
      if (!body.grantId) return Response.json({ error: 'grantId is required' }, { status: 400 });
      const audit = await base44.asServiceRole.entities.GrantAuditEntry.filter({ grantId: body.grantId }, '-created_date', 25);
      return Response.json({ audit });
    }

    if (action === 'completeRequirement') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.GrantRequirement.get(id);
      await logAudit(existing.grantId || existing.grant_id, [{ summary: `marked "${existing.title}" as Completed`, previousValue: '', newValue: 'Completed' }]);
      const requirement = await base44.asServiceRole.entities.GrantRequirement.update(id, {
        requirementStatus: 'Completed',
        status: 'complete',
        completionDate: new Date().toISOString().slice(0, 10),
        ...stamp
      });
      return Response.json({ requirement });
    }

    if (action === 'reopenRequirement') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const reopened = await base44.asServiceRole.entities.GrantRequirement.get(id);
      await logAudit(reopened.grantId || reopened.grant_id, [{ summary: `reopened "${reopened.title}"`, previousValue: 'Completed', newValue: 'In progress' }]);
      const requirement = await base44.asServiceRole.entities.GrantRequirement.update(id, {
        requirementStatus: 'In progress',
        status: 'in_progress',
        completionDate: null,
        ...stamp
      });
      return Response.json({ requirement });
    }

    if (action === 'deleteRequirement') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      await base44.asServiceRole.entities.GrantRequirement.delete(id);
      return Response.json({ deleted: true });
    }

    if (action === 'parseSpreadsheet') {
      const fileUrl = body.fileUrl;
      if (typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
        return Response.json({ error: 'A valid uploaded file URL is required' }, { status: 400 });
      }
      // Parsed directly with SheetJS rather than the LLM-based extractor, which
      // struggles to map a wide, dynamic-column sheet to a schema reliably.
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return Response.json({ error: 'We could not download that file.' }, { status: 400 });
      }
      const buffer = await fileResponse.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      const cleaned = grid.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));
      if (cleaned.length < 2) {
        return Response.json({ error: 'We could not find any data rows in that spreadsheet.' }, { status: 400 });
      }
      const headers = cleaned[0].map((header, index) => String(header ?? '').trim() || `Column ${index + 1}`);
      const rows = cleaned.slice(1).map((row) => headers.map((_, index) => String(row[index] ?? '').trim()));
      return Response.json({ headers, rows });
    }

    if (action === 'listDocuments') {
      if (!body.grantId) return Response.json({ error: 'grantId is required' }, { status: 400 });
      const documents = await base44.asServiceRole.entities.GrantDocument.filter({ grantId: body.grantId }, '-created_date', 200);
      return Response.json({ documents });
    }

    if (action === 'createDocument') {
      const data = body.data || {};
      if (!data.grantId || !data.filename || !data.fileUrl) {
        return Response.json({ error: 'grantId, filename and fileUrl are required' }, { status: 400 });
      }
      const document = await base44.asServiceRole.entities.GrantDocument.create({
        grantId: data.grantId,
        requirementId: data.requirementId || null,
        filename: data.filename,
        fileUrl: data.fileUrl,
        fileType: data.fileType || '',
        fileSize: Number(data.fileSize) || 0,
        documentCategory: data.documentCategory || 'Other',
        notes: data.notes || '',
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.full_name || user.email
      });
      await logAudit(data.grantId, [{ summary: `uploaded document "${data.filename}"`, previousValue: '', newValue: document.documentCategory }]);
      return Response.json({ document });
    }

    if (action === 'deleteDocument') {
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.GrantDocument.get(id);
      await base44.asServiceRole.entities.GrantDocument.delete(id);
      await logAudit(existing.grantId, [{ summary: `deleted document "${existing.filename}"`, previousValue: existing.documentCategory || '', newValue: '' }]);
      return Response.json({ deleted: true });
    }

    if (action === 'getReminderSettings') {
      const stored = await base44.asServiceRole.entities.GrantReminderSettings.list('-created_date', 1);
      return Response.json({ settings: { ...DEFAULT_SETTINGS, ...(stored[0] || {}) } });
    }

    if (action === 'saveReminderSettings') {
      const { errors, settings } = validateSettings(body.data);
      if (errors.length) return Response.json({ error: errors.join(' ') }, { status: 400 });
      const stored = await base44.asServiceRole.entities.GrantReminderSettings.list('-created_date', 1);
      const saved = stored[0]
        ? await base44.asServiceRole.entities.GrantReminderSettings.update(stored[0].id, { ...settings, updatedBy: user.email })
        : await base44.asServiceRole.entities.GrantReminderSettings.create({ ...settings, updatedBy: user.email });
      return Response.json({ settings: saved });
    }

    // Device notifications are raised in the browser, so the page asks which
    // reminders are due and have not been shown on any device yet.
    if (action === 'dueDeviceReminders') {
      const stored = await base44.asServiceRole.entities.GrantReminderSettings.list('-created_date', 1);
      const settings = { ...DEFAULT_SETTINGS, ...(stored[0] || {}) };
      if (!settings.deviceNotificationsEnabled) return Response.json({ reminders: [] });

      const [grants, requirements] = await Promise.all([
        base44.asServiceRole.entities.Grant.list('-created_date', 500),
        base44.asServiceRole.entities.GrantRequirement.list('-created_date', 1000)
      ]);
      const due = dueReminders(collectDeadlines(grants, withEffectiveStatus(requirements)), settings.reminderIntervals || []);
      const reminders = [];
      for (const item of due) {
        // Same key shape the push sender uses, so a reminder is never shown twice.
        const key = reminderKey({ ...item, recipient: item.recipient || '' }, item.interval, 'device');
        const already = await base44.asServiceRole.entities.GrantReminderDelivery.filter({ reminderKey: key }, '-created_date', 1);
        if (already.length) continue;
        const { subject, body: message } = composeEmail(item);
        reminders.push({
          reminderKey: key,
          grantId: item.grant.id,
          requirementId: item.requirement?.id || null,
          deadlineType: item.deadlineType,
          deadlineDate: item.deadlineDate,
          reminderInterval: item.interval,
          recipient: item.recipient || user.email,
          title: subject,
          message
        });
      }
      return Response.json({ reminders });
    }

    if (action === 'logDeviceReminder') {
      const data = body.data || {};
      if (!data.reminderKey || !data.grantId) return Response.json({ error: 'reminderKey and grantId are required' }, { status: 400 });
      const already = await base44.asServiceRole.entities.GrantReminderDelivery.filter({ reminderKey: data.reminderKey }, '-created_date', 1);
      if (already.length) return Response.json({ logged: false });
      await base44.asServiceRole.entities.GrantReminderDelivery.create({
        grantId: data.grantId,
        requirementId: data.requirementId || null,
        deadlineType: data.deadlineType,
        deadlineDate: data.deadlineDate,
        reminderInterval: Number(data.reminderInterval) || 0,
        recipient: data.recipient || user.email,
        deliveryType: 'device',
        reminderKey: data.reminderKey,
        sentAt: new Date().toISOString(),
        status: 'sent'
      });
      return Response.json({ logged: true });
    }

    if (action === 'listReminderDeliveries') {
      const deliveries = body.grantId
        ? await base44.asServiceRole.entities.GrantReminderDelivery.filter({ grantId: body.grantId }, '-created_date', 50)
        : await base44.asServiceRole.entities.GrantReminderDelivery.list('-created_date', 50);
      return Response.json({ deliveries });
    }

    // --- Web Push registration -------------------------------------------
    const readSecret = (name) => {
      try { return secrets.get(name) || ''; } catch { return ''; }
    };

    if (action === 'getPushConfig') {
      const vapid = vapidFrom(readSecret);
      return Response.json({ publicKey: vapid ? vapid.publicKey : null });
    }

    if (action === 'savePushSubscription') {
      const data = body.data || {};
      if (!data.endpoint || !data.p256dh || !data.auth) {
        return Response.json({ error: 'A complete push subscription is required' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint: data.endpoint }, '-created_date', 1);
      const record = {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userEmail: user.email,
        userAgent: String(data.userAgent || '').slice(0, 300),
        lastSeen: new Date().toISOString(),
        active: true
      };
      const saved = existing[0]
        ? await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, record)
        : await base44.asServiceRole.entities.PushSubscription.create(record);
      return Response.json({ subscription: { id: saved.id } });
    }

    if (action === 'removePushSubscription') {
      if (!body.endpoint) return Response.json({ error: 'endpoint is required' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint: body.endpoint }, '-created_date', 1);
      if (existing[0]) await base44.asServiceRole.entities.PushSubscription.delete(existing[0].id);
      return Response.json({ removed: true });
    }

    if (action === 'sendTestPush') {
      const vapid = vapidFrom(readSecret);
      if (!vapid) return Response.json({ error: 'Push keys are not configured for this app yet.' }, { status: 400 });
      const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ active: true }, '-created_date', 200);
      const mine = subscriptions.filter(s => s.userEmail === user.email);
      if (!mine.length) return Response.json({ error: 'No device is registered for push on your account yet.' }, { status: 400 });
      const result = await sendPush(mine, {
        title: "Lou's Place — Grant Reminder",
        body: 'Test notification: grant deadline reminders are working on this device.',
        url: '/?module=grants',
        tag: 'grant-reminder-test'
      }, vapid);
      return Response.json({ result });
    }

    if (action === 'askAssistant') {
      const reply = await base44.functions.invoke('grantAssistant', { question: body.question });
      return Response.json(reply.data);
    }

    if (action === 'runReminderCheck') {
      const run = await base44.functions.invoke('sendGrantReminders', {
        dryRun: body.dryRun === true,
        resend: body.resend === true
      });
      return Response.json({ result: run.data });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}