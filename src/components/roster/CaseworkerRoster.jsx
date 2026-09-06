import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { addDays, addMonths, addWeeks, endOfWeek, format, isSameDay, isSameMonth, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';
import CalendarHeader from './CalendarHeader';
import WeekCalendar from './WeekCalendar';
import MonthCalendar from './MonthCalendar';
import ShiftDetailPanel from './ShiftDetailPanel';
import RosterStats from './RosterStats';
import ShiftForm from './ShiftForm';
import StatusLegend from './StatusLegend';
import VolunteerList from './VolunteerList';
import EscalationWindow from './EscalationWindow';
import { shiftState, stateStyles, stateLabels, isInWeekOf, WEEK_OPTS, readEscalationHours, saveEscalationHours } from './rosterUtils';

export default function CaseworkerRoster({ shifts, alerts = [], refresh }) {
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [escalationHours, setEscalationHours] = useState(readEscalationHours);
  const stateOf = (s) => shiftState(s, escalationHours);

  const changeEscalation = (hours) => { saveEscalationHours(hours); setEscalationHours(hours); };

  useEffect(() => {
    base44.entities.User.list().then((list) => setVolunteers(list.filter((u) => u.role === 'volunteer'))).catch(() => setVolunteers([]));
  }, []);

  const shift = selected ? shifts.find((s) => s.id === selected.id) || selected : null;
  const close = () => { setSelected(null); setEditing(false); };
  const after = async () => { await refresh(); close(); setCreating(false); };

  const move = (step) => setCursor(
    view === 'day' ? addDays(cursor, step) : view === 'week' ? addWeeks(cursor, step) : addMonths(cursor, step)
  );
  const label = view === 'day'
    ? format(cursor, 'EEEE d MMMM yyyy')
    : view === 'week'
      ? `${format(startOfWeek(cursor, WEEK_OPTS), 'd MMM')} – ${format(endOfWeek(cursor, WEEK_OPTS), 'd MMM yyyy')}`
      : format(cursor, 'MMMM yyyy');

  // The first two stats follow whatever period the calendar is showing.
  const inPeriod = (s) => {
    const start = new Date(s.start_time);
    if (view === 'day') return isSameDay(start, cursor);
    if (view === 'month') return isSameMonth(start, cursor);
    return isInWeekOf(s.start_time, cursor);
  };
  const periodWord = view === 'day' ? 'on this day' : view === 'month' ? 'this month' : 'this week';

  const escalated = shifts.filter((s) => stateOf(s) === 'escalated');
  const stats = [
    ...(escalated.length ? [{ label: 'Escalated — needs attention', value: escalated.length, tone: 'border-[#5C2B24] bg-[#5C2B24] text-white' }] : []),
    { label: `Shifts still open ${periodWord}`, value: shifts.filter((s) => stateOf(s) === 'open' && inPeriod(s)).length },
    { label: `Shifts awaiting a standby response ${periodWord}`, value: shifts.filter((s) => stateOf(s) === 'standby_notified' && inPeriod(s)).length },
    { label: 'Shifts confirmed in the next 48 hours', value: shifts.filter((s) => stateOf(s) === 'confirmed').length }
  ];

  const logEvent = async (type, target) => {
    if (!target.assigned_volunteer_id) return;
    await base44.entities.VolunteerEvent.create({
      volunteer_id: target.assigned_volunteer_id,
      volunteer_name: target.assigned_volunteer_name,
      event_type: type,
      occurred_at: new Date().toISOString(),
      shift_id: target.id,
      shift_title: target.title
    });
  };

  const reassign = async (volunteer) => {
    await base44.entities.Shift.update(shift.id, volunteer
      ? { status: 'assigned', assigned_volunteer_id: volunteer.id, assigned_volunteer_name: volunteer.full_name, standby_notified_at: '' }
      : { status: 'open', assigned_volunteer_id: '', assigned_volunteer_name: '' });
    await refresh();
  };

  const Calendar = view === 'month' ? MonthCalendar : WeekCalendar;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Roster</h1>
          <p className="text-[#756760]">Everyone’s shifts in one calm view.</p>
        </div>
        <button onClick={() => setCreating(!creating)} className="rounded-xl bg-[#A45846] px-4 py-2.5 text-sm text-white">
          <Plus size={16} className="mr-1 inline" />New shift
        </button>
      </div>

      <RosterStats stats={stats} />

      {creating && (
        <div className="mt-4 rounded-2xl border border-[#E5D6C8] bg-white p-5">
          <ShiftForm onDone={after} onCancel={() => setCreating(false)} />
        </div>
      )}

      <CalendarHeader label={label} view={view} onView={setView} onPrev={() => move(-1)} onNext={() => move(1)} onToday={() => setCursor(new Date())} />
      <EscalationWindow hours={escalationHours} onChange={changeEscalation} />

      <Calendar
        date={cursor}
        shifts={shifts}
        onSelect={setSelected}
        days={view === 'day' ? [cursor] : undefined}
        toneFor={(s) => stateStyles[stateOf(s)]}
        flagFor={(s) => (['standby_notified', 'escalated'].includes(stateOf(s)) ? stateLabels[stateOf(s)] : null)}
      />

      {view === 'week' && !shifts.some((s) => isInWeekOf(s.start_time, cursor)) && (
        <p className="mt-3 text-sm text-[#756760]">No shifts scheduled this week yet. You can add one whenever you’re ready.</p>
      )}
      {view === 'day' && !shifts.some((s) => isSameDay(new Date(s.start_time), cursor)) && (
        <p className="mt-3 text-sm text-[#756760]">No shifts scheduled on this day yet. You can add one whenever you’re ready.</p>
      )}

      <StatusLegend states={['open', 'standby_notified', 'escalated', 'assigned', 'confirmed', 'completed']} />

      <VolunteerList volunteers={volunteers} />

      <ShiftDetailPanel shift={shift} onClose={close}>
        {editing ? (
          <ShiftForm shift={shift} onDone={after} onCancel={() => setEditing(false)} />
        ) : (
          <div className="grid gap-4">
            <label className="text-sm">
              <span className="text-[#A08D82]">Assign to</span>
              <select
                value={shift?.assigned_volunteer_id || ''}
                onChange={(e) => reassign(volunteers.find((v) => v.id === e.target.value))}
                className="mt-1 w-full rounded-xl border border-[#E5D6C8] bg-white p-3 text-sm"
              >
                <option value="">Leave open for a volunteer</option>
                {volunteers.map((v) => <option key={v.id} value={v.id}>{v.full_name || v.email}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditing(true)} className="rounded-xl border border-[#A45846] px-4 py-2.5 text-sm text-[#7D4037]">Edit details</button>
              {shift?.status !== 'completed' && (
                <button onClick={async () => { await logEvent('completed', shift); await base44.entities.Shift.update(shift.id, { status: 'completed' }); await refresh(); }} className="rounded-xl border border-[#E5D6C8] px-4 py-2.5 text-sm text-[#7D4037]">Mark complete</button>
              )}
              {shift?.assigned_volunteer_id && (
                <button onClick={async () => { await logEvent('no_show', shift); await refresh(); }} className="rounded-xl border border-[#E5D6C8] px-4 py-2.5 text-sm text-[#7D4037]">Record no-show</button>
              )}
              <button onClick={async () => { await base44.entities.Shift.delete(shift.id); await after(); }} className="rounded-xl px-4 py-2.5 text-sm text-[#8A6A5E] underline">Remove shift</button>
            </div>
          </div>
        )}
      </ShiftDetailPanel>
    </section>
  );
}