import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Circle } from 'lucide-react';

/** Client-level baseline coverage, accumulated across visits and caseworkers. */
export default function CoveragePanel({ client }) {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    setRecords(null);
    base44.entities.ClientCoverage.filter({ client_id: client.id }, 'specialisation', 200).then(setRecords);
  }, [client.id]);

  if (!records) return <p className="text-sm text-[#8A7C74]">Loading coverage…</p>;

  const groups = records.reduce((accumulator, record) => {
    accumulator[record.specialisation] = [...(accumulator[record.specialisation] || []), record];
    return accumulator;
  }, {});
  const specialisations = Object.keys(groups);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-lg font-semibold text-[#7D4037]">Coverage — what's been established so far</h3>
        <p className="mt-1 text-sm text-[#6B5D55]">
          A baseline picture built from completed notes. It shows what has been talked through, not whether it has been
          resolved — specialist consultation still adds what this can't.
        </p>
      </div>

      {!specialisations.length ? (
        <p className="rounded-xl border border-[#EFE2D6] bg-[#FDFBF7] p-4 text-sm text-[#6B5D55]">
          Nothing established yet — coverage appears once a note for this client has been marked complete and confirmed.
        </p>
      ) : (
        specialisations.map(specialisation => (
          <div key={specialisation} className="rounded-xl border border-[#EFE2D6] bg-[#FDFBF7] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#7D4037]">{specialisation}</p>
            <ul className="space-y-1.5">
              {groups[specialisation].map(record => (
                <li key={record.id} className="flex items-start gap-2 text-sm">
                  {record.status === 'Covered'
                    ? <Check size={16} className="mt-0.5 shrink-0 text-[#4B7B52]" />
                    : <Circle size={16} className="mt-0.5 shrink-0 text-[#C9B6A8]" />}
                  <span className={record.status === 'Covered' ? 'text-[#3D342F]' : 'text-[#6B5D55]'}>
                    {record.item_label}
                    <span className="ml-2 text-xs text-[#8A7C74]">
                      {record.status === 'Covered'
                        ? `established ${record.covered_date}${record.covered_by_name ? ` with ${record.covered_by_name}` : ''}`
                        : 'not yet covered'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}