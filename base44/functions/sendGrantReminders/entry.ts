import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { isCaseworker, withEffectiveStatus } from '../../shared/grants.js';
import { composePush, sendPush, vapidFrom } from '../../shared/webPush.js';
import {
  DEFAULT_SETTINGS,
  collectDeadlines,
  composeEmail,
  dueReminders,
  reminderKey,
  todayInSydney
} from '../../shared/grantReminders.js';

// Runs unattended from the scheduled workflow, so a missing user token is fine.
// A signed-in caller must still be a caseworker.
async function guard(base44) {
  try {
    const user = await base44.auth.me();
    if (user && !isCaseworker(user)) return 'Grants are available to caseworkers only';
  } catch {
    return null;
  }
  return null;
}

function readSecret(name) {
  try {
    return secrets.get(name) || '';
  } catch {
    return '';
  }
}

const readFlag = (name) => String(readSecret(name)).toLowerCase() === 'true';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const denied = await guard(base44);
    if (denied) return Response.json({ error: denied }, { status: 403 });

    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const dryRun = payload.dryRun === true || readFlag('GRANT_REMINDERS_DRY_RUN');
    // Manual test runs resend everything: the dedupe guard is bypassed and each
    // delivery is logged under its own key so the audit trail stays truthful.
    const resend = payload.resend === true;
    const today = todayInSydney();

    const stored = await base44.asServiceRole.entities.GrantReminderSettings.list('-created_date', 1);
    const settings = { ...DEFAULT_SETTINGS, ...(stored[0] || {}) };

    const [grants, requirements] = await Promise.all([
      base44.asServiceRole.entities.Grant.list('-created_date', 500),
      base44.asServiceRole.entities.GrantRequirement.list('-created_date', 1000)
    ]);

    const deadlines = collectDeadlines(grants, withEffectiveStatus(requirements));
    const due = dueReminders(deadlines, settings.reminderIntervals || [], today);

    const summary = {
      checked: deadlines.length, matched: due.length,
      sent: 0, skipped: 0, failed: 0, missingRecipient: 0,
      ccSent: 0, ccFailed: 0, ccErrors: [],
      pushed: 0, pushSkipped: 0, pushDevices: 0, dryRun,
      emailRemindersEnabled: settings.emailRemindersEnabled !== false,
      pushConfigured: false
    };

    // --- device / browser push ---------------------------------------------
    const vapid = vapidFrom(readSecret);
    summary.pushConfigured = !!vapid;
    if (settings.deviceNotificationsEnabled !== false && due.length) {
      const subscriptions = (await base44.asServiceRole.entities.PushSubscription.list('-created_date', 200))
        .filter(s => s.active !== false);
      summary.pushDevices = subscriptions.length;

      for (const item of due) {
        const key = reminderKey({ ...item, recipient: item.recipient || '' }, item.interval, 'device');
        const already = await base44.asServiceRole.entities.GrantReminderDelivery.filter({ reminderKey: key }, '-created_date', 1);
        if (already.length) { summary.pushSkipped += 1; continue; }

        const payload = composePush(item);
        if (!vapid || !subscriptions.length || dryRun) {
          // Local/demo fallback: no keys or no registered device yet, so log the
          // notification. Open browsers still raise it via the in-page fallback.
          console.log(`[push fallback] ${payload.title} — ${payload.body}`);
          continue;
        }

        const result = await sendPush(subscriptions, payload, vapid);
        for (const endpoint of result.expiredEndpoints) {
          const stale = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint }, '-created_date', 1);
          if (stale[0]) await base44.asServiceRole.entities.PushSubscription.delete(stale[0].id);
        }
        if (!result.sent) { summary.failed += result.failed; continue; }

        summary.pushed += result.sent;
        await base44.asServiceRole.entities.GrantReminderDelivery.create({
          grantId: item.grant.id,
          requirementId: item.requirement?.id || null,
          deadlineType: item.deadlineType,
          deadlineDate: item.deadlineDate,
          reminderInterval: item.interval,
          recipient: item.recipient || 'device',
          deliveryType: 'device',
          reminderKey: key,
          sentAt: new Date().toISOString(),
          status: 'sent'
        });
      }
    }

    if (settings.emailRemindersEnabled === false) {
      console.log('Email reminders are switched off.', summary);
      return Response.json(summary);
    }

    const deliveryType = dryRun ? 'mock' : 'email';
    const cc = (settings.ccEmails || []).filter(Boolean);

    for (const item of due) {
      if (!item.recipient) {
        summary.missingRecipient += 1;
        console.warn(`No recipient for ${item.deadlineType} on grant ${item.grant.id}; reminder skipped.`);
        continue;
      }

      const baseKey = reminderKey(item, item.interval, deliveryType);
      if (!resend) {
        const already = await base44.asServiceRole.entities.GrantReminderDelivery.filter({ reminderKey: baseKey }, '-created_date', 1);
        if (already.length) { summary.skipped += 1; continue; }
      }
      const key = resend ? `resend:${baseKey}:${Date.now()}` : baseKey;

      const { subject, body } = composeEmail(item);

      try {
        if (dryRun) {
          console.log(`[dry run] To: ${item.recipient}${cc.length ? ` · CC: ${cc.join(', ')}` : ''}\nSubject: ${subject}\n${body}`);
        } else {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: item.recipient,
            subject,
            body,
            from_name: "Lou's Place Operations Hub"
          });
          // Copies are sent one by one, and a copy that bounces must never make
          // the main reminder look failed or cause it to be sent again.
          for (const address of cc) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: address,
                subject: `[Copy] ${subject}`,
                body: `${body}\n\n---\nYou are receiving a copy of this reminder because you are on the grant reminder copy list.`,
                from_name: "Lou's Place Operations Hub"
              });
              summary.ccSent += 1;
            } catch (ccError) {
              summary.ccFailed += 1;
              summary.ccErrors.push(`${address}: ${ccError.message}`);
              console.error(`Reminder copy to ${address} failed: ${ccError.message}`);
            }
          }
        }
        await base44.asServiceRole.entities.GrantReminderDelivery.create({
          grantId: item.grant.id,
          requirementId: item.requirement?.id || null,
          deadlineType: item.deadlineType,
          deadlineDate: item.deadlineDate,
          reminderInterval: item.interval,
          recipient: item.recipient,
          deliveryType,
          reminderKey: key,
          sentAt: new Date().toISOString(),
          status: 'sent'
        });
        summary.sent += 1;
      } catch (sendError) {
        summary.failed += 1;
        console.error(`Reminder to ${item.recipient} failed: ${sendError.message}`);
        await base44.asServiceRole.entities.GrantReminderDelivery.create({
          grantId: item.grant.id,
          requirementId: item.requirement?.id || null,
          deadlineType: item.deadlineType,
          deadlineDate: item.deadlineDate,
          reminderInterval: item.interval,
          recipient: item.recipient,
          deliveryType,
          reminderKey: `failed:${key}:${Date.now()}`,
          sentAt: new Date().toISOString(),
          status: 'failed',
          failureReason: sendError.message
        });
      }
    }

    console.log('Grant reminder run complete', summary);
    return Response.json(summary);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}