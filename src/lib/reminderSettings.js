// Front-end validation for grant reminder settings. The backend re-validates.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_SETTINGS = {
  reminderIntervals: [7, 5, 3, 1],
  emailRemindersEnabled: true,
  deviceNotificationsEnabled: true,
  ccEmails: []
};

export function validateSettingsForm(form) {
  const errors = [];
  const seen = new Set();
  form.reminderIntervals.forEach((value, index) => {
    const days = Number(value);
    if (value === '' || Number.isNaN(days) || !Number.isInteger(days) || days < 0 || days > 365) {
      errors.push(`Reminder ${index + 1} must be a whole number of days between 0 and 365.`);
      return;
    }
    if (seen.has(days)) errors.push(`${days} days is listed more than once.`);
    seen.add(days);
  });
  if (!form.reminderIntervals.length) errors.push('Add at least one reminder interval.');
  form.ccEmails.forEach(email => {
    if (email.trim() && !EMAIL.test(email.trim())) errors.push(`"${email}" is not a valid email address.`);
  });
  return errors;
}

export const toPayload = (form) => ({
  reminderIntervals: form.reminderIntervals.map(Number),
  emailRemindersEnabled: form.emailRemindersEnabled,
  deviceNotificationsEnabled: form.deviceNotificationsEnabled,
  ccEmails: form.ccEmails.map(email => email.trim()).filter(Boolean)
});