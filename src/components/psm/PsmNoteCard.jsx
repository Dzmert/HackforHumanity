import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Flag } from 'lucide-react';
import NoteSummary from './NoteSummary';
import CoverageStatus from './CoverageStatus';

const RISK_STYLES = {
  High: 'bg-[#FBE3DE] text-[#8C2D1E]',
  Medium: 'bg-[#FFF1DC] text-[#8A5A16]',
  Low: 'bg-[#E7F1E7] text-[#3F6B45]'
};

export default function PsmNoteCard({ note, coverage }) {
  const [flagging, setFlagging] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState('');

  const act = async (action) => {
    setPending(true);
    setError('');
    const response = await base44.functions.invoke('psmReviewAction', { caseNoteId: note.id, action, followUpNote: followUp });
    setPending(false);
    if (response.data?.error) return setError(response.data.error);
    setOutcome(action === 'confirm' ? 'Confirmed — logged, no further action needed.' : 'Flagged — the caseworker has been notified.');
    setFlagging(false);
    setFollowUp('');
  };

  return (
    <article className="rounded-2xl border border-[#E4D3C3] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <b className="text-[#3D342F]">{note.client_name || note.client_reference}</b>
        <span className="text-xs text-[#8A7C74]">{note.note_date}</span>
        {note.safety_risk_level && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${RISK_STYLES[note.safety_risk_level] || ''}`}>
            {note.safety_risk_level} safety risk
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#7D4037]">Extracted summary</p>
          <NoteSummary note={note} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-[#7D4037]">Coverage</p>
          <CoverageStatus records={coverage} />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-sm font-semibold text-[#7D4037]">Next steps, as the caseworker recorded them</p>
        {note.next_steps?.length ? (
          <ul className="list-disc pl-5 text-sm text-[#3D342F]">{note.next_steps.map(step => <li key={step}>{step}</li>)}</ul>
        ) : <p className="text-sm text-[#8A7C74]">No next steps recorded.</p>}
      </div>

      {outcome ? (
        <p className="mt-4 text-sm text-[#4B7B52]">{outcome}</p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => act('confirm')}
              className="rounded-xl bg-[#7D4037] px-4 py-2 text-sm text-white disabled:opacity-60">
              <CheckCircle2 className="mr-2 inline" size={16} />Confirm — no further action needed
            </button>
            <button disabled={pending} onClick={() => setFlagging(!flagging)}
              className="rounded-xl border border-[#A45846] px-4 py-2 text-sm text-[#7D4037]">
              <Flag className="mr-2 inline" size={16} />Flag for follow-up
            </button>
          </div>
          {flagging && (
            <div className="flex flex-wrap gap-2">
              <input value={followUp} onChange={event => setFollowUp(event.target.value)} maxLength={1000}
                placeholder="What's needed?" className="flex-1 rounded-xl border border-[#E4D3C3] p-2.5 text-sm" />
              <button disabled={pending || !followUp.trim()} onClick={() => act('flag')}
                className="rounded-xl bg-[#A45846] px-4 py-2 text-sm text-white disabled:opacity-60">
                {pending ? 'Sending…' : 'Send to caseworker'}
              </button>
            </div>
          )}
          {error && <p className="text-sm text-[#A32E22]">{error}</p>}
        </div>
      )}
    </article>
  );
}