import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { summarise } from './volunteerReliability';
import { CHURN_WEEKS } from './rosterUtils';

export default function VolunteerList({ volunteers }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    base44.entities.VolunteerEvent.list('-occurred_at', 500).then(setEvents).catch(() => setEvents([]));
  }, []);

  if (!volunteers.length) return null;

  return (
    <div className="mt-8 rounded-2xl border border-[#E5D6C8] bg-white p-5">
      <h2 className="text-base font-semibold">Volunteers</h2>
      <p className="mt-1 text-sm text-[#756760]">Scheduling information to help you plan cover and check in with people — not a rating.</p>
      <ul className="mt-4 divide-y divide-[#F1E7DC]">
        {volunteers.map((volunteer) => {
          const summary = summarise(volunteer, events);
          return (
            <li key={volunteer.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm font-medium">{volunteer.full_name || volunteer.email}</p>
                <p className="text-xs text-[#A08D82]">
                  Last active {summary.lastActive ? format(summary.lastActive, 'd MMM yyyy') : 'not yet'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#756760]">
                <span className="rounded-lg bg-[#FBF1E7] px-2 py-1">{summary.completed} completed · {summary.dropped} dropped</span>
                {summary.noShows > 0 && <span className="rounded-lg bg-[#F2C6A8] px-2 py-1 text-[#7D4037]">{summary.noShows} no-show{summary.noShows > 1 ? 's' : ''}</span>}
                {summary.churnFlag && (
                  <span className="rounded-lg border border-[#E5D6C8] px-2 py-1 text-[#8A6A5E]">
                    {summary.weeksSinceSignUp === null ? 'Hasn’t signed up yet' : `Hasn’t signed up in ${summary.weeksSinceSignUp} weeks`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-[#A08D82]">A gentle flag appears after {CHURN_WEEKS} weeks without signing up for a shift.</p>
    </div>
  );
}