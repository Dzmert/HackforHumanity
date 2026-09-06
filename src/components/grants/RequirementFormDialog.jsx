import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { REQUIREMENT_STATUSES, REQUIREMENT_TYPES, validateRequirement } from '@/lib/grants';

const fieldClass = 'mt-1 w-full rounded-xl border border-[#E5D6C8] bg-white p-3 text-[#3D342F] focus:border-[#A45846] focus:outline-none';
const labelClass = 'block text-sm text-[#756760]';

const blank = {
  title: '', description: '', requirementType: '', dueDate: '',
  personResponsible: '', personResponsibleEmail: '', requirementStatus: 'Not started', notes: ''
};

const fromRequirement = (requirement) => {
  if (!requirement) return { ...blank };
  const values = { ...blank };
  for (const key of Object.keys(blank)) values[key] = requirement[key] ?? '';
  if (!values.dueDate) values.dueDate = requirement.due_date ?? '';
  if (!values.requirementStatus) values.requirementStatus = 'Not started';
  return values;
};

export default function RequirementFormDialog({ open, requirement, onClose, onSave }) {
  const [form, setForm] = useState(fromRequirement(requirement));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState(null);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validateRequirement(form);
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

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#3D342F]">{requirement ? 'Edit requirement' : 'Add requirement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Title *
            <input value={form.title} onChange={e => set('title', e.target.value)} className={fieldClass} />
            {errors.title && <span className="mt-1 block text-xs text-[#8A2E1D]">{errors.title}</span>}
          </label>
          <label className={labelClass}>
            Requirement type
            <select value={form.requirementType} onChange={e => set('requirementType', e.target.value)} className={fieldClass}>
              <option value="">Not specified</option>
              {REQUIREMENT_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Due date *
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={fieldClass} />
            {errors.dueDate && <span className="mt-1 block text-xs text-[#8A2E1D]">{errors.dueDate}</span>}
          </label>
          <label className={labelClass}>
            Person responsible
            <input value={form.personResponsible} onChange={e => set('personResponsible', e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Their email
            <input type="email" value={form.personResponsibleEmail} onChange={e => set('personResponsibleEmail', e.target.value)} className={fieldClass} />
            {errors.personResponsibleEmail && <span className="mt-1 block text-xs text-[#8A2E1D]">{errors.personResponsibleEmail}</span>}
          </label>
          <label className={labelClass}>
            Status
            <select value={form.requirementStatus} onChange={e => set('requirementStatus', e.target.value)} className={fieldClass}>
              {REQUIREMENT_STATUSES.map(status => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Description
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} className={fieldClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Notes
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={fieldClass} />
          </label>
          {failure && <p className="text-sm text-[#8A2E1D] sm:col-span-2">{failure}</p>}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button disabled={saving} className="rounded-xl bg-[#7D4037] px-5 py-3 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save requirement'}</button>
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-[#A45846]">Cancel</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}