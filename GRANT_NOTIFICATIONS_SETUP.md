# Grant deadline notifications — setup

Grant reminders are sent by the background engine (`sendGrantReminders`), which runs
on a schedule and does **not** need the Grants page to be open. It delivers:

- **Email** — to the person in charge / person responsible, plus any CC addresses.
- **Browser / device push** — real Web Push through `public/grant-push-sw.js`,
  delivered even when the app is closed.

Both channels use the reminder intervals configured in **Grants → Grant Reminder
Settings**, and cover application due dates, acquittal due dates, renewal dates and
compliance requirement due dates. Every send is recorded in `GrantReminderDelivery`
with a deterministic key, so a reminder is never delivered twice.

## Required app secrets (never commit these)

Generate a VAPID key pair once:

```bash
npx web-push generate-vapid-keys
```

Then add these secrets to the app (Dashboard → Settings → Secrets), on the **main
branch**:

| Secret | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | the `Public Key` from the command above |
| `VAPID_PRIVATE_KEY` | the `Private Key` from the command above |
| `VAPID_SUBJECT` | `mailto:` address or https URL for your organisation |
| `GRANT_REMINDERS_DRY_RUN` | optional — `true` logs reminders instead of sending them |

## Local / demo fallback

If the VAPID secrets are absent (or no device has registered yet), the engine logs
each notification it would have sent and the app raises the same reminder through the
Notification API while the Operations Hub is open. Nothing breaks and no duplicate is
produced, because both paths share the delivery key.

## Turning it on for a device

1. Open **Grants → Grant Reminder Settings**.
2. Under *Reminders on this device*, choose **Turn on for this device**.
3. The browser asks for permission once. If it is declined, the app never asks again —
   the person re-enables it from their browser's site settings.
4. **Send test notification** confirms delivery end to end.

Subscriptions are stored in the `PushSubscription` entity and pruned automatically when
a push service reports them expired (404/410).

## Scheduling

The daily send is a workflow calling `sendGrantReminders`. Workflows can only be created
or edited on the main branch.