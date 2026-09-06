import { format } from 'date-fns';

export default function ShiftBlock({ shift, tone, onSelect, style, compact, flag }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(shift)}
      style={style}
      className={`w-full overflow-hidden rounded-lg px-2 py-1 text-left leading-tight transition hover:opacity-90 ${tone} ${style ? 'absolute inset-x-1' : ''}`}
    >
      <span className={`block truncate font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>{shift.title}</span>
      <span className={`block truncate ${compact ? 'text-[10px]' : 'text-[11px]'} opacity-80`}>
        {flag || format(new Date(shift.start_time), 'h:mm a')}
      </span>
    </button>
  );
}