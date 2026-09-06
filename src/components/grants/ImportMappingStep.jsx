import { IMPORT_FIELDS } from '@/lib/grantImport';

const control = 'rounded-xl border border-[#E5D6C8] bg-white p-2 text-sm text-[#3D342F] focus:border-[#A45846] focus:outline-none';

export default function ImportMappingStep({ headers, rows, mapping, onChange }) {
  const taken = (field, header) => Object.entries(mapping).some(([key, value]) => value === field && key !== header);

  return (
    <div>
      <p className="text-sm text-[#756760]">
        We found {headers.length} columns and {rows.length} data rows. Check the suggested matches below — unmatched columns are simply ignored.
      </p>
      <div className="mt-4 grid gap-2">
        {headers.map((header, index) => (
          <div key={header} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EFE3D6] bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-[#3D342F]">{header}</p>
              <p className="truncate text-xs text-[#A79488]">e.g. {rows[0]?.[index] || 'blank'}</p>
            </div>
            <select value={mapping[header] || ''} onChange={e => onChange({ ...mapping, [header]: e.target.value })} className={control}>
              <option value="">Do not import</option>
              {IMPORT_FIELDS.map(([field, label]) => (
                <option key={field} value={field} disabled={taken(field, header)}>{label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}