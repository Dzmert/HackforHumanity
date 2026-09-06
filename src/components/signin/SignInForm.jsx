import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DoorOpen } from 'lucide-react';
import ChecklistPrompt from './ChecklistPrompt';

const inputClass = 'w-full rounded-xl border border-[#E4D3C3] bg-white p-3 text-sm';

export default function SignInForm({ onSaved }) {
  const [form, setForm] = useState({ clientName: '', clientReference: '', reasonForVisit: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await base44.functions.invoke('triageSignIn', form);
    setSaving(false);
    if (response.data?.error) return setError(response.data.error);
    setResult(response.data);
    setForm({ clientName: '', clientReference: '', reasonForVisit: '' });
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-2xl border border-[#E5D6C8] bg-white p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <input required placeholder="Name or reference code" value={form.clientName}
            onChange={event => setForm({ ...form, clientName: event.target.value })} className={inputClass} />
          <input placeholder="Reference code (if known)" value={form.clientReference}
            onChange={event => setForm({ ...form, clientReference: event.target.value })} className={inputClass} />
        </div>
        <textarea required maxLength={600} placeholder="Reason for visit — in her words where you can"
          value={form.reasonForVisit} onChange={event => setForm({ ...form, reasonForVisit: event.target.value })}
          className={`${inputClass} mt-3 h-24`} />
        <button disabled={saving} className="mt-3 rounded-xl bg-[#A45846] px-4 py-3 text-sm text-white disabled:opacity-60">
          <DoorOpen className="mr-2 inline" size={18} />{saving ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="mt-3 text-sm text-[#A32E22]">{error}</p>}
      </form>

      {result && (
        <div className="space-y-3 rounded-2xl border border-[#E5D6C8] bg-white p-6">
          <p className="text-sm text-[#3D342F]">
            <b>{result.client?.name}</b> signed in.
            {result.client?.is_placeholder && ' A placeholder profile was created for her — a caseworker can complete it.'}
          </p>
          <div className="rounded-xl border border-[#EFE2D6] bg-[#FDFBF7] p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#7D4037]">Preliminary guess — pending confirmation</p>
            <p className="mt-1 text-[#3D342F]">Likely area: <b>{result.inferred}</b></p>
            {result.basis && <p className="mt-1 text-xs text-[#6B5D55]">Drawn from: “{result.basis}”</p>}
            <p className="mt-2 text-xs text-[#8A7C74]">
              This is a routing hint from her words only. Confirm it with her — nothing is recorded as fact until you do.
            </p>
          </div>
          {result.mismatch && (
            <ChecklistPrompt specialisation={result.inferred} clientId={result.client?.id} />
          )}
        </div>
      )}
    </div>
  );
}