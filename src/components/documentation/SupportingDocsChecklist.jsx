import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X } from 'lucide-react';
import { DOC_STATUSES, RECIPIENT_TYPES, defaultDocuments } from './supportingDocDefaults';

/** Supporting documents for one letter. Provisional defaults, fully editable. */
export default function SupportingDocsChecklist({ letter }) {
  const [items, setItems] = useState([]);
  const [recipientType, setRecipientType] = useState(letter.recipient_type || RECIPIENT_TYPES[0]);
  const [newItem, setNewItem] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    base44.entities.SupportingDocument.filter({ support_letter_id: letter.id }, 'sort_order', 100).then(setItems);
  useEffect(() => { load(); }, [letter.id]);

  const seed = async () => {
    setBusy(true);
    const labels = defaultDocuments(letter.letter_type, recipientType);
    if (letter.recipient_type !== recipientType) await base44.entities.SupportLetter.update(letter.id, { recipient_type: recipientType });
    for (const [index, label] of labels.entries()) {
      await base44.entities.SupportingDocument.create({
        support_letter_id: letter.id,
        client_reference: letter.client_reference,
        item_label: label,
        status: 'Not yet asked',
        is_provisional_default: true,
        sort_order: index
      });
    }
    setBusy(false);
    load();
  };

  const add = async (event) => {
    event.preventDefault();
    if (!newItem.trim()) return;
    await base44.entities.SupportingDocument.create({
      support_letter_id: letter.id,
      client_reference: letter.client_reference,
      item_label: newItem.trim(),
      status: 'Not yet asked',
      is_provisional_default: false,
      sort_order: items.length
    });
    setNewItem('');
    load();
  };

  const setStatus = async (item, status) => {
    await base44.entities.SupportingDocument.update(item.id, { status });
    load();
  };
  const remove = async (item) => { await base44.entities.SupportingDocument.delete(item.id); load(); };

  return (
    <div className="rounded-xl border border-[#EFE2D6] bg-[#FDFBF7] p-4">
      <p className="text-sm font-semibold text-[#7D4037]">Supporting documents</p>
      <p className="mt-1 text-xs text-[#8A7C74]">
        Default sets are provisional — what these services commonly ask for. Add or remove anything.
      </p>

      {!items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={recipientType} onChange={event => setRecipientType(event.target.value)}
            className="rounded-xl border border-[#E4D3C3] bg-white p-2.5 text-sm">
            {RECIPIENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <button disabled={busy} onClick={seed}
            className="rounded-xl bg-[#A45846] px-3 py-2 text-sm text-white disabled:opacity-60">
            {busy ? 'Adding…' : 'Start checklist'}
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex-1 text-[#3D342F]">{item.item_label}</span>
              <select value={item.status} onChange={event => setStatus(item, event.target.value)}
                className="rounded-lg border border-[#E4D3C3] bg-white p-1.5 text-xs">
                {DOC_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <button onClick={() => remove(item)} aria-label="Remove item" className="text-[#8A7C74]"><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={newItem} onChange={event => setNewItem(event.target.value)} placeholder="Add a document"
          className="flex-1 rounded-xl border border-[#E4D3C3] bg-white p-2.5 text-sm" />
        <button className="rounded-xl border border-[#A45846] px-3 py-2 text-sm text-[#7D4037]"><Plus size={16} /></button>
      </form>
    </div>
  );
}