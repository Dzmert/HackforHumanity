import { format, isSameMonth, isToday } from 'date-fns';
import ShiftBlock from './ShiftBlock';
import { monthDays, shiftsOnDay } from './rosterUtils';

export default function MonthCalendar({ date, shifts, onSelect, toneFor }) {
  const days = monthDays(date);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E5D6C8] bg-white p-2">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7">
          {days.slice(0, 7).map((day) => (
            <p key={day.toISOString()} className="px-2 pb-2 text-[11px] uppercase tracking-wide text-[#A08D82]">{format(day, 'EEE')}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayShifts = shiftsOnDay(shifts, day);
            return (
              <div key={day.toISOString()} className={`min-h-[104px] rounded-xl p-1.5 ${isSameMonth(day, date) ? 'bg-[#FDFBF7]' : 'bg-[#F6F0E8]/60'}`}>
                <p className={`px-1 text-xs font-semibold ${isToday(day) ? 'text-[#A45846]' : 'text-[#7B6E66]'}`}>{format(day, 'd')}</p>
                <div className="mt-1 space-y-1">
                  {dayShifts.slice(0, 3).map((shift) => (
                    <ShiftBlock key={shift.id} shift={shift} tone={toneFor(shift)} onSelect={onSelect} compact />
                  ))}
                  {dayShifts.length > 3 && (
                    <p className="px-1 text-[10px] text-[#A08D82]">+{dayShifts.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}