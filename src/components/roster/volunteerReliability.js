import { differenceInCalendarWeeks } from 'date-fns';
import { CHURN_WEEKS } from './rosterUtils';

/** Aggregates the append-only VolunteerEvent log into per-volunteer scheduling information. */
export const summarise = (volunteer, events) => {
  const mine = events.filter((event) => event.volunteer_id === volunteer.id);
  const count = (type) => mine.filter((event) => event.event_type === type).length;
  const lastSignUp = mine
    .filter((event) => event.event_type === 'claimed')
    .map((event) => new Date(event.occurred_at))
    .sort((a, b) => b - a)[0];
  const lastActive = mine.map((event) => new Date(event.occurred_at)).sort((a, b) => b - a)[0];
  const weeksSinceSignUp = lastSignUp ? differenceInCalendarWeeks(new Date(), lastSignUp) : null;

  return {
    completed: count('completed'),
    dropped: count('dropped'),
    noShows: count('no_show'),
    lastActive,
    weeksSinceSignUp,
    churnFlag: weeksSinceSignUp === null || weeksSinceSignUp >= CHURN_WEEKS
  };
};