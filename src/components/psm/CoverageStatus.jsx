import { Check, Circle } from 'lucide-react';

/** Compact coverage read-out for one client, grouped by specialisation. */
export default function CoverageStatus({ records }) {
  if (!records.length) return <p className="text-sm text-[#8A7C74]">No coverage recorded for this client yet.</p>;

  const groups = records.reduce((accumulator, record) => {
    accumulator[record.specialisation] = [...(accumulator[record.specialisation] || []), record];
    return accumulator;
  }, {});

  return (
    <div className="space-y-2">
      {Object.entries(groups).map(([specialisation, items]) => (
        <div key={specialisation}>
          <p className="text-xs font-medium uppercase tracking-wide text-[#7D4037]">{specialisation}</p>
          <ul className="mt-1 space-y-1">
            {items.map(item => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {item.status === 'Covered'
                  ? <Check size={16} className="mt-0.5 shrink-0 text-[#4B7B52]" />
                  : <Circle size={16} className="mt-0.5 shrink-0 text-[#C9B6A8]" />}
                <span className={item.status === 'Covered' ? 'text-[#3D342F]' : 'text-[#6B5D55]'}>{item.item_label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}