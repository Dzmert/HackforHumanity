import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GRANT_STATUSES, validateGrant } from '@/lib/grants';

const GRANT_TYPES = ['Government', 'Philanthropic', 'Corporate', 'Community', 'Other'];
const ACQUITTAL_TYPES = ['Financial acquittal', 'Narrative report', 'Financial and narrative', 'No acquittal required'];

const fieldClass = 'mt-1 w-full rounded-xl border border-[#E5D6C8] bg-white p-3 text-[#3D342F] focus:border-[#A45846] focus:outline-none';
const labelClass = 'block text-sm text-[#756760]';

const blank = {
  grantName: '', funderName: '', grantAmount: '', grantType: '', grantStatus: 'Potential',
  applicationDueDate: '', fundingStartDate: '', fundingEndDate: '', acquittalType: '',
  acquittalDueDate: '', renewalDate: '', grantWebsite: '', grantReferenceNumber: '',
  personInCharge: '', personInChargeEmail: '', grantPurpose: '', additionalNotes: ''
};

const fromGrant = (grant) => {
  if (!grant) return { ...blank };
  const values = { ...blank };
  for (const key of Object.keys(blank)) values[key] = grant[key] ?? '';
  if (!values.grantName) values.grantName = grant.name ?? '';
  if (!values.funderName) values.funderName = grant.funder ?? '';
  if (values.grantAmount === '' && grant.amount != null) values.grantAmount = grant.amount;
  if (!values.renewalDate) values.renewalDate = grant.renewal_date ?? '';
  if (!values.grantStatus) values.grantStatus = 'Potential';
  return values;
};

const Field = ({ form, set, errors, name, label, type = 'text', ...rest }) => (
  <label className={labelClass}>
    {label}
    <input type={type} value={form[name] ?? ''} onChange={e => set(name, e.target.value)} className={fieldClass} {...rest} />
    {errors[name] && <span className="mt-1 block text-xs text-[#8A2E1D]">{errors[name]}</span>}
  </label>
);

const Select = ({ form, set, name, label, options, placeholder }) => (
  <label className={labelClass}>
    {label}
    <select value={form[name] ?? ''} onChange={e => set(name, e.target.value)} className={fieldClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

export default function GrantFormDialog({ open, grant, onClose, onSave }) {
  const [form, setForm] = useState(fromGrant(grant));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState(null);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validateGrant(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setFailure(null);
    try {
      await onSave(form);
    } catch (error) {
      setFailure(error.message || 'Something went wrong while saving.');
    }
    setSaving(false);
  };

  const shared = { form, set, errors };

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#3D342F]">{grant ? 'Edit grant' : 'Add grant'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field {...shared} name="grantName" label="Grant name *" /></div>
          <Field {...shared} name="funderName" label="Funder name" />
          <Field {...shared} name="grantAmount" label="Grant amount (AUD)" type="number" min="0" step="0.01" />
          <Select {...shared} name="grantType" label="Grant type" options={GRANT_TYPES} placeholder="Not specified" />
          <Select {...shared} name="grantStatus" label="Grant status" options={GRANT_STATUSES} />
          <Field {...shared} name="applicationDueDate" label="Application due date" type="date" />
          <Field {...shared} name="fundingStartDate" label="Funding start date" type="date" />
          <Field {...shared} name="fundingEndDate" label="Funding end date" type="date" />
          <Select {...shared} name="acquittalType" label="Acquittal type" options={ACQUITTAL_TYPES} placeholder="Not specified" />
          <Field {...shared} name="acquittalDueDate" label="Acquittal due date" type="date" />
          <Field {...shared} name="renewalDate" label="Renewal date" type="date" />
          <Field {...shared} name="grantReferenceNumber" label="Grant reference number" />
          <Field {...shared} name="grantWebsite" label="Grant website" type="url" placeholder="https://" />
          <Field {...shared} name="personInCharge" label="Person in charge" />
          <Field {...shared} name="personInChargeEmail" label="Person in charge email" type="email" />
          <label className={`${labelClass} sm:col-span-2`}>
            Grant purpose
            <textarea rows={3} value={form.grantPurpose} onChange={e => set('grantPurpose', e.target.value)} className={fieldClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Additional notes
            <textarea rows={3} value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} className={fieldClass} />
          </label>
          {failure && <p className="text-sm text-[#8A2E1D] sm:col-span-2">{failure}</p>}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-[#7D4037] px-5 py-3 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save grant'}</button>
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-[#A45846]">Cancel</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}