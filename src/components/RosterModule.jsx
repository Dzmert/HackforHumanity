import CaseworkerRoster from '@/components/roster/CaseworkerRoster';
import VolunteerRoster from '@/components/roster/VolunteerRoster';

export default function RosterModule({ shifts, alerts, availability, user, refresh }) {
  const fullAccess = ['admin', 'caseworker'].includes(user?.role);
  return fullAccess
    ? <CaseworkerRoster shifts={shifts} alerts={alerts} refresh={refresh} />
    : <VolunteerRoster shifts={shifts} availability={availability} user={user} refresh={refresh} />;
}