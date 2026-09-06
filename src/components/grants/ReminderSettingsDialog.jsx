import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, BellRing } from 'lucide-react';
import { grantsApi } from '@/lib/grants';
import { DEFAULT_SETTINGS, validateSettingsForm, toPayload } from '@/lib/reminderSettings';
import DeviceNotificationSettings from '@/components/grants/DeviceNotificationSettings';

const control = 'rounded-xl border border-[#E5D6C8] bg-white p-2.5 text-[#3D342F] focus:border-[#A45846] focus:outline-none';

const Toggle = ({ label, hint, value, onChange }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-[#EFE3D6] bg-white p-4">
    <div>
      <p className="font-medium text-[#3D342F]">{label}</p>
      <p className="text-sm text-[#756760]">{hint}</p>
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${value ? 'bg-[#A45846]' : 'bg-[#DCD1C7]'}`}
      aria-pressed={value}
      aria-label={label}
    >
      <span className={`block h-6 w-6 rounded-full bg-white transition ${value ? 'translate-x-6' : ''}`} />
    </button>
  </div>
);

export default function ReminderSettingsDialog({ onClose }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    grantsApi.getReminderSettings()
      .then(result => {
        const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
        setForm({
          reminderIntervals: settings.reminderIntervals.map(String),
          emailRemindersEnabled: settings.emailRemindersEnabled !== false,
          deviceNotificationsEnabled: settings.deviceNotificationsEnabled !== false,
          ccEmails: settings.ccEmails.length ? settings.ccEmails : ['']
        });
      })
      .catch(error => setErrors([error.message || 'We could not load the reminder settings.']));
  }, []);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setList = (key, index, value) => set(key, form[key].map((item, i) => (i === index ? value : item)));
  const removeAt = (key, index) => set(key, form[key].filter((_, i) => i !== index));

  const save = async () => {
    const found = validateSettingsForm(form);
    setErrors(found);
    setStatus(null);
    if (found.length) return;
    setBusy(true);
    try {
      await grantsApi.saveReminderSettings(toPayload(form));
      setStatus('Reminder settings saved.');
    } catch (error) {
      setErrors([error.message || 'The settings could not be saved.']);
    }
    setBusy(false);
  };

  const runNow = async () => {
    setBusy(true);
    setStatus(null);
    setErrors([]);
    try {
      // Manual runs always resend, so testing shows a real email every press.
      const { result } = await grantsApi.runReminderCheck(true);
      const copies = result.ccSent ? ` ${result.ccSent} CC copy/copies sent.` : '';
      const ccProblems = result.ccErrors?.length ? ` CC problems: ${result.ccErrors.join('; ')}` : '';
      setStatus(`Check complete: ${result.sent} reminder(s) sent to the person in charge, ${result.failed} failed.${copies}${ccProblems}`);
    } catch (error) {
      setErrors([error.message || 'The reminder check could not be run.']);
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold text-[#3D342F]">
            <BellRing className="text-[#A45846]" size={22} /> Grant Reminder Settings
          </DialogTitle>
        </DialogHeader>

        {!form && <p className="text-[#756760]">Loading settings…</p>}

        {form && (
          <div className="grid gap-5">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">Reminder schedule</h3>
              <p className="mt-1 text-sm text-[#756760]">
                Applies to application due dates, acquittal due dates, renewal dates and compliance requirement due dates.
              </p>
              <div className="mt-3 grid gap-2">
                {form.reminderIntervals.map((value, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="number" min="0" max="365" value={value}
                      onChange={e => setList('reminderIntervals', index, e.target.value)}
                      className={`${control} w-24`}
                    />
                    <span className="text-[#756760]">days before</span>
                    <button type="button" onClick={() => removeAt('reminderIntervals', index)} aria-label="Remove reminder" className="text-[#756760]">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => set('reminderIntervals', [...form.reminderIntervals, ''])}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] px-4 py-2 text-sm text-[#7D4037]"
              >
                <Plus size={16} /> Add reminder
              </button>
            </section>

            <div className="grid gap-3">
              <Toggle
                label="Email reminders"
                hint="Sent to the person in charge, or the person responsible for a requirement."
                value={form.emailRemindersEnabled}
                onChange={value => set('emailRemindersEnabled', value)}
              />
              <Toggle
                label="Device notifications"
                hint="Sent to registered devices as browser notifications, even when the app is closed."
                value={form.deviceNotificationsEnabled}
                onChange={value => set('deviceNotificationsEnabled', value)}
              />
              {form.deviceNotificationsEnabled && <DeviceNotificationSettings />}
            </div>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">Default CC emails</h3>
              <div className="mt-3 grid gap-2">
                {form.ccEmails.map((email, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="email" value={email} placeholder="admin@organisation.org"
                      onChange={e => setList('ccEmails', index, e.target.value)}
                      className={`${control} flex-1`}
                    />
                    <button type="button" onClick={() => removeAt('ccEmails', index)} aria-label="Remove email" className="text-[#756760]">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => set('ccEmails', [...form.ccEmails, ''])}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] px-4 py-2 text-sm text-[#7D4037]"
              >
                <Plus size={16} /> Add CC email
              </button>
            </section>

            {!!errors.length && (
              <ul className="rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-4 text-sm text-[#8A2E1D]">
                {errors.map(error => <li key={error}>{error}</li>)}
              </ul>
            )}
            {status && <p className="rounded-xl border border-[#CEDCC9] bg-[#F1F6EF] p-4 text-sm text-[#3D5A3A]">{status}</p>}

            <div className="flex flex-wrap gap-3">
              <button disabled={busy} onClick={save} className="rounded-xl bg-[#7D4037] px-5 py-3 text-white disabled:opacity-60">
                {busy ? 'Working…' : 'Save settings'}
              </button>
              <button disabled={busy} onClick={runNow} className="rounded-xl border border-[#E5D6C8] px-5 py-3 text-[#7D4037] disabled:opacity-60">
                Run reminder check now
              </button>
              <button onClick={onClose} className="rounded-xl px-5 py-3 text-[#A45846]">Close</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}