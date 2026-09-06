import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Circle } from 'lucide-react';

/**
 * Shown to the caseworker on shift when the door guess points somewhere other
 * than her own specialisation: what usually matters in that area, so she can
 * begin well without waiting on anyone.
 */
export default function ChecklistPrompt({ specialisation, clientId }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    base44.functions
      .invoke('getSpecialisationChecklist', { specialisation, clientId })
      .then(response => setItems(response.data?.items || []));
  }, [specialisation, clientId]);

  return (
    <div className="rounded-xl border border-[#D9A88F] bg-[#FFF6EF] p-4">
      <p className="text-sm font-semibold text-[#7D4037]">{specialisation} — what usually matters here</p>
      <p className="mt-1 text-xs text-[#6B5D55]">
        Surfaced because this looks like a different area to your specialisation. A starting point, not a script — and no
        substitute for a conversation with the {specialisation} caseworker.
      </p>
      {!items ? (
        <p className="mt-3 text-sm text-[#8A7C74]">Loading checklist…</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map(item => (
            <li key={item.key} className="flex items-start gap-2 text-sm">
              {item.status === 'Covered'
                ? <Check size={16} className="mt-0.5 shrink-0 text-[#4B7B52]" />
                : <Circle size={16} className="mt-0.5 shrink-0 text-[#C9B6A8]" />}
              <span className={item.status === 'Covered' ? 'text-[#3D342F]' : 'text-[#6B5D55]'}>
                {item.label}
                {item.status === 'Covered' && <span className="ml-2 text-xs text-[#8A7C74]">already established</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}