import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { HeartHandshake } from 'lucide-react';
import CalendarHeader from './CalendarHeader';
import WeekCalendar from './WeekCalendar';
import ShiftDetailPanel from './ShiftDetailPanel';
import StatusLegend from './StatusLegend';
import StandbyOptIn from './StandbyOptIn';
import { shiftState, stateStyles, isStandbyEligible, isInWeekOf, WEEK_OPTS } from './rosterUtils';

// Volunteers never see escalation — that flag is for caseworkers only.
const stateOf = (shift) => shiftState(shift, Infinity);

export default function VolunteerRoster({ shifts, availability = [], user, refresh }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

  const isMine = (s) => s.assigned_volunteer_id === user?.id;
  const standbyRequests = shifts.filter((s) => stateOf(s) === 'standby_notified' && isStandbyEligible(s, availability));
  const isStandby = (s) => standbyRequests.some((r) => r.id === s.id);

  const visible = shifts.filter((s) => isMine(s) || (stateOf(s) === 'open') || isStandby(s));
  const weekShifts = visible.filter((s) => isInWeekOf(s.start_time, cursor));
  const shift = selected ? shifts.find((s) => s.id === selected.id) || selected : null;
  const close = () => setSelected(null);

  const logEvent = (type, target) => base44.entities.VolunteerEvent.create({
    volunteer_id: user.id,
    volunteer_name: user.full_name,
    event_type: type,
    occurred_at: new Date().toISOString(),
    shift_id: target.id,
    shift_title: target.title
  });

  const claim = async () => {
    await base44.entities.Shift.update(shift.id, {
      status: 'assigned',
      assigned_volunteer_id: user.id,
      assigned_volunteer_name: user.full_name,
      standby_notified_at: ''
    });
    await logEvent('claimed', shift);
    setMessage('Thank you for picking this up — it’s now yours on the roster.');
    await refresh();
    close();
  };

  const drop = async () => {
    await base44.entities.Shift.update(shift.id, {
      status: 'open',
      assigned_volunteer_id: '',
      assigned_volunteer_name: '',
      standby_notified_at: new Date().toISOString(),
      previous_volunteer_name: user.full_name
    });
    await logEvent('dropped', shift);
    await base44.entities.Alert.create({
      module: 'roster',
      title: 'Standby volunteers notified',
      message: `${shift.title} has become free and standby volunteers have been let know.`,
      priority: 'medium',
      source_id: shift.id
    });
    setMessage('Thanks for the heads up — we’re reaching out to standby volunteers now.');
    await refresh();
    close();
  };

  return (
    <section>
      <h1 className="text-3xl font-semibold">My roster</h1>
      <p className="text-[#756760]">Your shifts, and any that are open if you’d like to take one.</p>

      {message && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#E5D6C8] bg-[#FBF1E7] p-4 text-sm text-[#7D4037]">
          <HeartHandshake size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{message}</p>
          <button onClick={() => setMessage('')} className="text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-[#E5D6C8] bg-white p-5">
        <h2 className="text-base font-semibold">Standby requests</h2>
        {standbyRequests.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {standbyRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{request.title} · {format(new Date(request.start_time), 'EEE d MMM, h:mm a')}</span>
                <button onClick={() => setSelected(request)} className="rounded-xl border border-[#A45846] px-3 py-1.5 text-xs text-[#7D4037]">View</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[#756760]">No standby requests at the moment — everything is covered. We’ll show them here if a shift becomes free on one of your standby days.</p>
        )}
      </div>

      <CalendarHeader
        label={`${format(startOfWeek(cursor, WEEK_OPTS), 'd MMM')} – ${format(endOfWeek(cursor, WEEK_OPTS), 'd MMM yyyy')}`}
        onPrev={() => setCursor(addWeeks(cursor, -1))}
        onNext={() => setCursor(addWeeks(cursor, 1))}
        onToday={() => setCursor(new Date())}
      />
      <WeekCalendar
        date={cursor}
        shifts={weekShifts}
        onSelect={setSelected}
        toneFor={(s) => stateStyles[stateOf(s)]}
        flagFor={(s) => (isStandby(s) ? 'Standby request' : null)}
      />
      {!weekShifts.length && (
        <p className="mt-3 text-sm text-[#756760]">Nothing on your calendar this week. Have a restful one, or look ahead to another week.</p>
      )}
      <StatusLegend states={['open', 'standby_notified', 'assigned', 'confirmed', 'completed']} />

      <StandbyOptIn availability={availability} user={user} refresh={refresh} />

      <ShiftDetailPanel shift={shift} onClose={close}>
        {shift && (isMine(shift) ? (
          <div>
            <p className="text-sm text-[#756760]">If this shift no longer suits you, you can drop it and standby volunteers will be let know.</p>
            <button onClick={drop} className="mt-3 rounded-xl border border-[#A45846] px-4 py-2.5 text-sm text-[#7D4037]">Drop shift</button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[#756760]">
              {isStandby(shift)
                ? 'This shift has become free and you’re on standby for this day. You’re welcome to take it if it suits you.'
                : 'This shift is open. You’re welcome to take it if it suits you.'}
            </p>
            <button onClick={claim} className="mt-3 rounded-xl bg-[#7D4037] px-4 py-2.5 text-sm text-white">Claim this shift</button>
          </div>
        ))}
      </ShiftDetailPanel>
    </section>
  );
}