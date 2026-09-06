import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarHeader({ label, onPrev, onNext, onToday, view, onView }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onPrev} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full border border-[#E5D6C8] bg-white text-[#7D4037]">
          <ChevronLeft size={18} />
        </button>
        <button onClick={onNext} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-full border border-[#E5D6C8] bg-white text-[#7D4037]">
          <ChevronRight size={18} />
        </button>
        <h2 className="ml-1 text-lg font-semibold">{label}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToday} className="rounded-xl border border-[#E5D6C8] bg-white px-3 py-2 text-sm text-[#7D4037]">Today</button>
        {onView && (
          <div className="flex rounded-xl border border-[#E5D6C8] bg-white p-1">
            {['day', 'week', 'month'].map((option) => (
              <button
                key={option}
                onClick={() => onView(option)}
                className={`rounded-lg px-3 py-1.5 text-sm capitalize ${view === option ? 'bg-[#A45846] text-white' : 'text-[#7D4037]'}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}