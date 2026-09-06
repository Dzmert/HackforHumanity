import { format, isToday } from 'date-fns';
import ShiftBlock from './ShiftBlock';
import { weekDays, shiftsOnDay, blockPosition, DAY_START_HOUR, DAY_END_HOUR } from './rosterUtils';

const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

// Renders the hourly grid for one or more days. `days` overrides the default full week.
export default function WeekCalendar({ date, shifts, onSelect, toneFor, flagFor, days }) {
  const columns = days || weekDays(date);
  const grid = columns.length > 1 ? 'grid grid-cols-[56px_repeat(7,1fr)]' : 'grid grid-cols-[56px_1fr]';
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E5D6C8] bg-white">
      <div className={columns.length > 1 ? 'min-w-[720px]' : 'min-w-[280px]'}>
        <div className={`${grid} border-b border-[#EFE3D6]`}>
          <div />
          {columns.map((day) => (
            <div key={day.toISOString()} className="px-2 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-[#A08D82]">{format(day, 'EEE')}</p>
              <p className={`text-sm font-semibold ${isToday(day) ? 'text-[#A45846]' : 'text-[#3D342F]'}`}>{format(day, 'd')}</p>
            </div>
          ))}
        </div>
        <div className={grid}>
          <div>
            {hours.map((hour) => (
              <div key={hour} className="h-14 border-b border-[#F4EBE1] pr-2 pt-1 text-right text-[10px] text-[#A08D82]">
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>
          {columns.map((day) => (
            <div key={day.toISOString()} className="relative border-l border-[#F4EBE1]">
              {hours.map((hour) => <div key={hour} className="h-14 border-b border-[#F4EBE1]" />)}
              {shiftsOnDay(shifts, day).map((shift) => (
                <ShiftBlock key={shift.id} shift={shift} tone={toneFor(shift)} onSelect={onSelect} style={blockPosition(shift)} compact flag={flagFor?.(shift)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}