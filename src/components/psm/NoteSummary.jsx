import { EXTRACTION_FIELDS, isStated } from '@/components/documentation/extractionFields';

const SKIP = ['next_steps'];

/** The confirmed extracted picture, showing only what the note actually states. */
export default function NoteSummary({ note }) {
  const rows = EXTRACTION_FIELDS.filter(field => !SKIP.includes(field.key)).filter(field =>
    isStated(field, field.type === 'list' || field.type === 'tags' ? note[field.key] || [] : note[field.key])
  );

  if (!rows.length) return <p className="text-sm text-[#8A7C74]">Nothing was extracted from this note.</p>;

  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map(field => (
        <div key={field.key} className="flex gap-2">
          <dt className="shrink-0 text-[#8A7C74]">{field.label}:</dt>
          <dd className="text-[#3D342F]">
            {Array.isArray(note[field.key]) ? note[field.key].join(', ') : note[field.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}