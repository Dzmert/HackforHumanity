import { AlertTriangle, Copy } from 'lucide-react';
import { FIELD_LABELS } from '@/lib/grantImport';
import { display, displayAmount, grantName } from '@/lib/grants';

const ACTIONS = [['skip', 'Skip'], ['create', 'Import anyway'], ['update', 'Update existing grant']];

export default function ImportPreviewStep({ rows, onAction }) {
  return (
    <div className="grid gap-3">
      {rows.map(row => (
        <div
          key={row.index}
          className={`rounded-xl border p-4 ${row.errors.length ? 'border-[#E4B5AA] bg-[#FCF3F1]' : 'border-[#EFE3D6] bg-white'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-medium text-[#3D342F]">Row {row.index + 2}: {display(row.values.grantName)}</p>
              <p className="text-sm text-[#756760]">
                {display(row.values.funderName)} · {displayAmount(row.values.grantAmount)} · {display(row.values.grantStatus)}
              </p>
              <p className="text-sm text-[#756760]">
                Application due: {display(row.values.applicationDueDate)} · Acquittal due: {display(row.values.acquittalDueDate)}
              </p>
            </div>
            {row.errors.length
              ? <span className="rounded-full bg-[#F3D2CB] px-3 py-1 text-xs text-[#8A2E1D]">Will not import</span>
              : row.duplicate
                ? <span className="flex items-center gap-1 rounded-full bg-[#F6E1D3] px-3 py-1 text-xs text-[#7D4037]"><Copy size={12} /> Possible duplicate</span>
                : <span className="rounded-full bg-[#DCE8DA] px-3 py-1 text-xs text-[#3D5A3A]">Ready to import</span>}
          </div>

          {row.errors.map(error => (
            <p key={error} className="mt-2 flex items-start gap-2 text-sm text-[#8A2E1D]"><AlertTriangle size={14} className="mt-0.5" /> {error}</p>
          ))}
          {row.warnings.map(warning => (
            <p key={warning} className="mt-2 text-sm text-[#7D4037]">{warning}</p>
          ))}

          {!row.errors.length && row.duplicate && (
            <div className="mt-3 rounded-xl bg-[#FDFBF7] p-3 text-sm">
              <p className="text-[#756760]">
                {row.duplicate.reason} as <span className="font-medium text-[#3D342F]">{grantName(row.duplicate.grant)}</span>
                {row.duplicate.grant.grantReferenceNumber ? ` (ref ${row.duplicate.grant.grantReferenceNumber})` : ''}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACTIONS.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => onAction(row.index, value)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${row.action === value ? 'bg-[#7D4037] text-white' : 'border border-[#E5D6C8] text-[#756760]'}`}
                  >{label}</button>
                ))}
              </div>
              {row.action === 'update' && (
                <p className="mt-2 text-[#756760]">
                  “{grantName(row.duplicate.grant)}” will be updated. Existing values are kept wherever the spreadsheet cell is blank.
                </p>
              )}
            </div>
          )}

          {!row.errors.length && !row.duplicate && row.values.grantPurpose && (
            <p className="mt-2 break-words text-sm text-[#756760]">{FIELD_LABELS.grantPurpose}: {row.values.grantPurpose}</p>
          )}
        </div>
      ))}
    </div>
  );
}