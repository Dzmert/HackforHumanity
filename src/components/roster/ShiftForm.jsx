import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const toInput = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');
const empty = { title: '', start_time: '', end_time: '', notes: '' };

export default function ShiftForm({ shift, onDone, onCancel }) {
  const [form, setForm] = useState(
    shift ? { title: shift.title || '', start_time: toInput(shift.start_time), end_time: toInput(shift.end_time), notes: shift.notes || '' } : empty
  );
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const save = async (event) => {
    event.preventDefault();
    if (shift) await base44.entities.Shift.update(shift.id, form);
    else await base44.entities.Shift.create({ ...form, status: 'open' });
    onDone();
  };

  const field = 'w-full rounded-xl border border-[#E5D6C8] bg-white p-3 text-sm';
  return (
    <form onSubmit={save} className="grid gap-3">
      <input required placeholder="Shift name" value={form.title} onChange={set('title')} className={field} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[#A08D82]">Starts<input required type="datetime-local" value={form.start_time} onChange={set('start_time')} className={`mt-1 ${field}`} /></label>
        <label className="text-xs text-[#A08D82]">Ends<input required type="datetime-local" value={form.end_time} onChange={set('end_time')} className={`mt-1 ${field}`} /></label>
      </div>
      <textarea placeholder="Notes for whoever takes this shift" value={form.notes} onChange={set('notes')} rows={2} className={field} />
      <div className="flex gap-2">
        <button className="rounded-xl bg-[#7D4037] px-4 py-2.5 text-sm text-white">{shift ? 'Save changes' : 'Add shift'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-[#E5D6C8] px-4 py-2.5 text-sm text-[#7D4037]">Cancel</button>}
      </div>
    </form>
  );
}