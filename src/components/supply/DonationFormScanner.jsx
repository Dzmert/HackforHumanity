import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ScanLine, Upload, Loader2, AlertTriangle, Check, X } from 'lucide-react';

const emptyDraft = { donor_name: '', donor_email: '', donation_date: '', monetary_amount: null, items: [], warnings: [] };

/**
 * Reads a scanned/photographed donation form with AI, then lets a volunteer correct the
 * extracted values before they are applied to stock. Nothing is written to InventoryItem
 * or Donor until "Confirm and update stock" is pressed.
 */
export default function DonationFormScanner({ items, donors, refresh }) {
  const [stage, setStage] = useState('idle'); // idle | reading | review | saving
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const reset = () => { setStage('idle'); setDraft(emptyDraft); setError(''); setFileName(''); };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setFileName(file.name);
    setStage('reading');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { data } = await base44.functions.invoke('extractDonationForm', { fileUrl: file_url });
      if (data?.error) throw new Error(data.error);
      setDraft({
        ...emptyDraft,
        ...data,
        items: (data.items || []).map(item => ({
          // Pre-select the existing stock item the AI matched, so the quantity is added
          // to the right record rather than creating a duplicate.
          stockId: items.find(existing => existing.name === item.matched_stock_name)?.id || '',
          name: item.name || '',
          quantity: item.quantity ?? '',
          unit: item.unit || 'items'
        }))
      });
      setStage('review');
    } catch (submitError) {
      setError(submitError.message || 'The form could not be read. Try a clearer photo or enter the donation manually.');
      setStage('idle');
    }
  };

  const updateItem = (index, patch) => {
    setDraft(current => ({ ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  };
  const removeItem = (index) => {
    setDraft(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  };

  const usableItems = draft.items.filter(item => item.name.trim() && Number(item.quantity) > 0);

  const confirm = async () => {
    setStage('saving');
    setError('');
    try {
      for (const item of usableItems) {
        const quantity = Number(item.quantity);
        const existing = item.stockId ? items.find(stock => stock.id === item.stockId) : null;
        if (existing) {
          await base44.entities.InventoryItem.update(existing.id, { quantity: (existing.quantity || 0) + quantity });
        } else {
          await base44.entities.InventoryItem.create({ name: item.name.trim(), quantity, unit: item.unit || 'items' });
        }
      }

      // Keep a donor record so outreach still works, without duplicating an existing donor.
      const donorName = draft.donor_name?.trim();
      const donorEmail = draft.donor_email?.trim();
      if (donorName || donorEmail) {
        const match = donors.find(donor =>
          (donorEmail && donor.email?.toLowerCase() === donorEmail.toLowerCase()) ||
          (donorName && donor.name?.toLowerCase() === donorName.toLowerCase())
        );
        if (!match) {
          await base44.entities.Donor.create({ name: donorName || donorEmail, ...(donorEmail ? { email: donorEmail } : {}) });
        } else if (donorEmail && !match.email) {
          await base44.entities.Donor.update(match.id, { email: donorEmail });
        }
      }

      reset();
      refresh();
    } catch (saveError) {
      setError(saveError.message || 'The stock could not be updated. Please check the values and try again.');
      setStage('review');
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#E5D6C8] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <ScanLine className="text-[#A45846]" />
        <div className="mr-auto">
          <h2 className="font-semibold">Scan a donation form</h2>
          <p className="text-sm text-[#756760]">Upload a photo or scan of a paper form. The details are read for you, then you check them before stock changes.</p>
        </div>
        {stage === 'idle' && (
          <label className="cursor-pointer rounded-xl bg-[#7D4037] px-4 py-2 text-sm text-white">
            <Upload className="mr-2 inline" size={15} />Choose form
            <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>

      {stage === 'reading' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#756760]">
          <Loader2 className="animate-spin" size={16} />Reading {fileName}…
        </p>
      )}

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      {(stage === 'review' || stage === 'saving') && (
        <div className="mt-5 grid gap-4">
          {draft.warnings?.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Please check these before confirming</p>
              <ul className="mt-1 list-disc pl-5">
                {draft.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
              </ul>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm">Donor name
              <input value={draft.donor_name || ''} onChange={e => setDraft({ ...draft, donor_name: e.target.value })} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm">Donor email
              <input type="email" value={draft.donor_email || ''} onChange={e => setDraft({ ...draft, donor_email: e.target.value })} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm">Date on form
              <input type="date" value={draft.donation_date || ''} onChange={e => setDraft({ ...draft, donation_date: e.target.value })} className="mt-1 w-full rounded-lg border p-2" />
            </label>
          </div>

          {draft.monetary_amount != null && draft.monetary_amount !== '' && (
            <p className="rounded-xl bg-[#FBF7F3] p-3 text-sm text-[#756760]">
              A monetary donation of <b>${Number(draft.monetary_amount).toFixed(2)}</b> was read from this form. Money is recorded separately from stock, so it is shown here for your records only.
            </p>
          )}

          <div>
            <p className="text-sm font-medium">Donated items</p>
            {draft.items.length === 0 && <p className="mt-1 text-sm text-[#756760]">No items were read from this form.</p>}
            <div className="mt-2 grid gap-2">
              {draft.items.map((item, index) => (
                <div key={index} className="grid items-end gap-2 rounded-xl border border-[#E5D6C8] p-3 sm:grid-cols-[1fr_1fr_5rem_6rem_2rem]">
                  <label className="text-xs text-[#756760]">Read as
                    <input value={item.name} onChange={e => updateItem(index, { name: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm text-black" />
                  </label>
                  <label className="text-xs text-[#756760]">Add to stock item
                    <select value={item.stockId} onChange={e => updateItem(index, { stockId: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm text-black">
                      <option value="">Create new item</option>
                      {items.map(stock => <option key={stock.id} value={stock.id}>{stock.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-[#756760]">Quantity
                    <input type="number" min="0" step="any" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm text-black" />
                  </label>
                  <label className="text-xs text-[#756760]">Unit
                    <input value={item.unit} onChange={e => updateItem(index, { unit: e.target.value })} disabled={Boolean(item.stockId)} className="mt-1 w-full rounded-lg border p-2 text-sm text-black disabled:bg-[#F5F0EB]" />
                  </label>
                  <button type="button" onClick={() => removeItem(index)} aria-label={`Remove ${item.name || 'item'}`} className="rounded-lg border p-2 text-[#756760]">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={stage === 'saving' || usableItems.length === 0} onClick={confirm} className="rounded-xl bg-[#A45846] px-4 py-2 text-sm text-white disabled:opacity-50">
              {stage === 'saving'
                ? <><Loader2 className="mr-2 inline animate-spin" size={15} />Updating stock…</>
                : <><Check className="mr-2 inline" size={15} />Confirm and update stock</>}
            </button>
            <button type="button" onClick={reset} disabled={stage === 'saving'} className="rounded-xl border px-4 py-2 text-sm">Discard</button>
            {usableItems.length === 0 && <span className="text-sm text-[#756760]">Add a name and a quantity above to update stock.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
