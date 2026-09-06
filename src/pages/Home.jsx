import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AppShell from '@/components/AppShell';
import Dashboard from '@/components/Dashboard';
import GrantsModule from '@/components/GrantsModule';
import RosterModule from '@/components/RosterModule';
import SupplyModule from '@/components/SupplyModule';
import DocumentationModule from '@/components/DocumentationModule';
import ClientsModule from '@/components/clients/ClientsModule';
import SignInModule from '@/components/signin/SignInModule';
import { NavGuardProvider, useNavGuard } from '@/lib/NavGuardContext';

function HomeContent() {
  // A grant reminder notification opens the app at ?module=grants&grant=<id>.
  const requested = new URLSearchParams(window.location.search).get('module');
  const [active, setActive] = useState(
    ['dashboard', 'signin', 'clients', 'grants', 'roster', 'supply', 'documents'].includes(requested) ? requested : 'dashboard'
  );
  const { attemptNavigation } = useNavGuard();
  const [data, setData] = useState({ grants: [], requirements: [], shifts: [], items: [], donors: [], notes: [], alerts: [], availability: [], clients: [] });
  const { user } = useAuth();

  const load = async (section) => {
    if (section === 'dashboard') {
      const [alerts, shifts, items, notes] = await Promise.all([
        base44.entities.Alert.list('-created_date', 100),
        base44.entities.Shift.list('-created_date', 100),
        base44.entities.InventoryItem.list('-created_date', 100),
        base44.entities.CaseNote.list('-created_date', 100)
      ]);
      setData(current => ({ ...current, alerts: alerts.filter(alert => !alert.resolved), shifts, items, notes }));
    }
    if (section === 'grants') {
      const [grants, requirements] = await Promise.all([
        base44.entities.Grant.list('-created_date', 100),
        base44.entities.GrantRequirement.list('-created_date', 100)
      ]);
      setData(current => ({ ...current, grants, requirements }));
    }
    if (section === 'clients') {
      const clients = await base44.entities.Client.list('-created_date', 300);
      setData(current => ({ ...current, clients }));
    }
    if (section === 'roster') {
      const [shifts, alerts, availability] = await Promise.all([
        base44.entities.Shift.list('-created_date', 100),
        base44.entities.Alert.list('-created_date', 100),
        base44.entities.StandbyAvailability.list('-created_date', 100)
      ]);
      setData(current => ({ ...current, shifts, availability, alerts: alerts.filter(alert => !alert.resolved) }));
    }
    if (section === 'supply') {
      const [items, donors] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date', 100),
        base44.entities.Donor.list('-created_date', 100)
      ]);
      setData(current => ({ ...current, items, donors }));
    }
  };

  useEffect(() => { load(active); }, [active, user?.role]);

  const stats = {
    alerts: data.alerts.length,
    shifts: data.shifts.filter(shift => shift.status !== 'completed').length,
    items: data.items.length,
    notes: data.notes.length
  };
  const content = {
    dashboard: <Dashboard stats={stats} alerts={data.alerts} onOpen={next => attemptNavigation(() => setActive(next))} />,
    signin: <SignInModule role={user?.role} />,
    clients: <ClientsModule clients={data.clients} role={user?.role} refresh={() => load('clients')} />,
    grants: <GrantsModule grants={data.grants} requirements={data.requirements} refresh={() => load('grants')} />,
    roster: <RosterModule shifts={data.shifts} alerts={data.alerts} availability={data.availability} user={user} refresh={() => load('roster')} />,
    supply: <SupplyModule items={data.items} donors={data.donors} refresh={() => load('supply')} />,
    documents: <DocumentationModule refresh={() => load('documents')} />
  };

  return (
    <AppShell active={active} onChange={next => attemptNavigation(() => setActive(next))} role={user?.role}>
      {content[active]}
    </AppShell>
  );
}

export default function Home() {
  return <NavGuardProvider><HomeContent /></NavGuardProvider>;
}