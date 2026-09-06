import { NOT_STATED, isStated } from './extractionFields';

const inputClass = 'w-full rounded-lg border border-[#E4D3C3] bg-white p-2 text-sm';

export default function ExtractionFieldRow({ field, value, sourceCount, onChange, onFocusField }) {
  const stated = isStated(field, value);

  return (
    <div
      onMouseEnter={() => onFocusField(field.key)}
      onFocus={() => onFocusField(field.key)}
      onClick={() => onFocusField(field.key)}
      className="rounded-xl border border-[#EFE2D6] bg-white p-3"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-[#7D4037]">{field.label}</span>
        {stated
          ? <span className="text-[11px] text-[#8A7C74]">{sourceCount} source{sourceCount === 1 ? '' : 's'}</span>
          : <span className="rounded-full bg-[#F0E6DC] px-2 py-0.5 text-[11px] text-[#6B5D55]">{NOT_STATED}</span>}
      </div>

      {field.type === 'tags' && (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(value.includes(option) ? value.filter(item => item !== option) : [...value, option])}
              className={`rounded-full px-2.5 py-1 text-xs ${value.includes(option) ? 'bg-[#7D4037] text-white' : 'bg-[#F8F1E8] text-[#6B5D55]'}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {field.type === 'choice' && (
        <select value={stated ? value : ''} onChange={event => onChange(event.target.value || NOT_STATED)} className={inputClass}>
          <option value="">{NOT_STATED}</option>
          {field.options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      )}

      {field.type === 'text' && (
        <input value={value} onChange={event => onChange(event.target.value)} className={inputClass} />
      )}

      {field.type === 'list' && (
        <textarea
          value={value.join('\n')}
          onChange={event => onChange(event.target.value.split('\n').map(line => line.trim()).filter(Boolean))}
          placeholder={NOT_STATED}
          className={`${inputClass} h-20`}
        />
      )}
    </div>
  );
}