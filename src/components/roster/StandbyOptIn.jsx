import { base44 } from '@/api/base44Client';

const days = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];

export default function StandbyOptIn({ availability, user, refresh }) {
  const toggle = async (dayOfWeek) => {
    const existing = availability.find((slot) => slot.day_of_week === dayOfWeek);
    if (existing) await base44.entities.StandbyAvailability.delete(existing.id);
    else await base44.entities.StandbyAvailability.create({ volunteer_id: user.id, volunteer_name: user.full_name, day_of_week: dayOfWeek, part_of_day: 'any' });
    refresh();
  };

  return (
    <div className="mt-6 rounded-2xl border border-[#E5D6C8] bg-white p-5">
      <h2 className="text-base font-semibold">Standby days</h2>
      <p className="mt-1 text-sm text-[#756760]">Choose the days you’re happy to hear about a shift that’s become free. You can change these any time.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {days.map(([label, value]) => {
          const on = availability.some((slot) => slot.day_of_week === value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={`rounded-xl px-3 py-2 text-sm ${on ? 'bg-[#7D4037] text-white' : 'border border-[#E5D6C8] text-[#7D4037]'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}