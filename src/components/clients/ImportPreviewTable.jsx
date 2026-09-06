import { AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ImportPreviewTable({ preview, onToggle }) {
  return (
    <div className="max-h-[45vh] overflow-auto rounded-xl border border-[#E4D3C3]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#F8F1E8] text-xs uppercase tracking-wide text-[#7D4037]">
          <tr>
            <th className="p-3">Import</th>
            <th className="p-3">Name</th>
            <th className="p-3">Reference code</th>
            <th className="p-3">Caseworker</th>
            <th className="p-3">Possible duplicate</th>
          </tr>
        </thead>
        <tbody>
          {preview.map(entry => (
            <tr key={entry.key} className={`border-t border-[#EFE2D6] ${entry.duplicateOf ? 'bg-[#FDF3E7]' : ''}`}>
              <td className="p-3 align-top">
                <Checkbox checked={entry.include} onCheckedChange={() => onToggle(entry.key)} aria-label={`Import ${entry.row.name}`} />
              </td>
              <td className="p-3 align-top font-medium">{entry.row.name}</td>
              <td className="p-3 align-top">
                {entry.row.reference_code || entry.generatedCode}
                {entry.generatedCode && <span className="ml-2 rounded-full bg-[#E8EFE6] px-2 py-0.5 text-xs text-[#4A6B4A]">auto</span>}
              </td>
              <td className="p-3 align-top text-[#6B5D55]">{entry.row.assigned_caseworker || '—'}</td>
              <td className="p-3 align-top text-[#8A5A2B]">
                {entry.duplicateOf ? (
                  <span className="flex items-start gap-1.5"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{entry.duplicateOf}</span>
                ) : <span className="text-[#9C8F87]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}