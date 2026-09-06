import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Save } from 'lucide-react';
import { useNavGuard } from '@/lib/NavGuardContext';
import { useCaseNoteDraft, useAutosave } from './useCaseNoteDraft';
import UnfinalizedNoteDialog from './UnfinalizedNoteDialog';
import ExtractionReview from './ExtractionReview';
import { normalizeExtraction } from './extractionFields';

const today = () => new Date().toISOString().slice(0, 10);

export default function CaseNoteForm({ onSaved }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [noteDate, setNoteDate] = useState(today());
  const [narrative, setNarrative] = useState('');
  const [completing, setCompleting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const { persist, reset, savedAt, saving } = useCaseNoteDraft();
  const { setGuard } = useNavGuard();

  useEffect(() => { base44.entities.Client.list('name', 300).then(setClients); }, []);

  const client = clients.find(entry => entry.id === clientId);
  const unfinished = Boolean(clientId && narrative.trim());

  const buildPayload = useCallback((status = 'draft') => {
    if (!clientId || !narrative.trim()) return null;
    const selected = clients.find(entry => entry.id === clientId);
    return {
      client_id: clientId,
      client_name: selected?.name || '',
      client_reference: selected?.reference_code || selected?.name || 'Unknown',
      note_date: noteDate,
      note: narrative,
      status
    };
  }, [clientId, clients, narrative, noteDate]);

  useAutosave(unfinished, () => buildPayload('draft'), persist);

  useEffect(() => {
    setGuard(unfinished ? (proceed) => setPending(() => proceed) : null);
    return () => setGuard(null);
  }, [unfinished, setGuard]);

  const clearForm = () => { setClientId(''); setNoteDate(today()); setNarrative(''); setExtraction(null); reset(); };

  const saveDraft = async () => {
    const payload = buildPayload('draft');
    if (!payload) { setError('Choose a client and write the narrative before saving.'); return; }
    setError('');
    await persist(payload);
  };

  // Mark as Complete runs the analysis and opens the review screen. Nothing is
  // committed as complete until Confirm & Finalize.
  const markComplete = async () => {
    const payload = buildPayload('complete');
    if (!payload) { setError('Choose a client and write the narrative before marking complete.'); return; }
    setError('');
    setCompleting(true);
    try {
      const response = await base44.functions.invoke('analyzeCaseNote', { narrative });
      if (response.data?.error) throw new Error(response.data.error);
      setExtraction(normalizeExtraction(response.data));
    } catch (analysisError) {
      setError(analysisError?.message || 'The narrative could not be analysed.');
    }
    setCompleting(false);
  };

  const confirmAndFinalize = async (extractionPayload) => {
    const payload = buildPayload('complete');
    if (!payload) return;
    setConfirming(true);
    try {
      const noteId = await persist({ ...payload, ...extractionPayload });
      // Confirmed fields feed the client's coverage baseline, and may prompt a
      // specialist follow-up.
      await base44.functions.invoke('updateClientCoverage', { caseNoteId: noteId });
      setExtraction(null);
      clearForm();
      onSaved?.();
    } catch (confirmError) {
      setError(confirmError?.message || 'The note could not be finalized.');
    }
    setConfirming(false);
  };

  const leaveAsIncomplete = async () => {
    setLeaving(true);
    try {
      const payload = buildPayload('draft');
      if (payload) await persist(payload);
      const proceed = pending;
      setPending(null);
      clearForm();
      proceed?.();
      onSaved?.();
    } catch (leaveError) {
      setError(leaveError?.message || 'The note could not be saved.');
    }
    setLeaving(false);
  };

  if (extraction) {
    return (
      <>
        <ExtractionReview
          narrative={narrative}
          extraction={extraction}
          confirming={confirming}
          onCancel={() => setExtraction(null)}
          onConfirm={confirmAndFinalize}
        />
        {error && <p className="mt-2 text-sm text-[#B3261E]">{error}</p>}
        <UnfinalizedNoteDialog
          open={Boolean(pending)}
          leaving={leaving}
          onContinueEditing={() => setPending(null)}
          onLeaveIncomplete={leaveAsIncomplete}
        />
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E5D6C8] bg-white p-6">
      <h2 className="font-heading text-xl font-semibold text-[#7D4037]">New case note</h2>
      <p className="mt-1 text-sm text-[#6B5D55]">Write it however you write it — there's no required structure.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-[#6B5D55]">Client name</span>
          <select value={clientId} onChange={event => setClientId(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E4D3C3] p-3">
            <option value="">Select a client…</option>
            {clients.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[#6B5D55]">Note date</span>
          <input type="date" value={noteDate} onChange={event => setNoteDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E4D3C3] p-3" />
        </label>
      </div>

      <textarea
        value={narrative}
        onChange={event => setNarrative(event.target.value)}
        placeholder="Narrative…"
        className="mt-3 h-72 w-full rounded-xl border border-[#E4D3C3] p-3"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={saveDraft} disabled={saving}><Save size={17} className="mr-2" />Save Draft</Button>
        <Button className="bg-[#7D4037] hover:bg-[#6A342C]" onClick={markComplete} disabled={completing}>
          <CheckCircle2 size={17} className="mr-2" />{completing ? 'Finalizing…' : 'Mark as Complete'}
        </Button>
        {savedAt && <span className="text-xs text-[#8A7C74]">Text saved at {savedAt.toLocaleTimeString()}</span>}
      </div>

      <p className="mt-3 text-xs text-[#8A7C74]">
        {client ? `Filed against ${client.name}. ` : ''}Only notes marked complete can be used for gap-checks or letter generation.
      </p>
      {error && <p className="mt-2 text-sm text-[#B3261E]">{error}</p>}

      <UnfinalizedNoteDialog
        open={Boolean(pending)}
        leaving={leaving}
        onContinueEditing={() => setPending(null)}
        onLeaveIncomplete={leaveAsIncomplete}
      />
    </section>
  );
}