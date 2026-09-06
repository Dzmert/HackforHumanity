import { useEffect, useMemo, useState } from 'react';
import { Plus, ShieldAlert, FileSpreadsheet, RefreshCw, Settings, Sparkles } from 'lucide-react';
import ReminderSettingsDialog from '@/components/grants/ReminderSettingsDialog';
import AssistantPanel from '@/components/grants/AssistantPanel';
import useDeviceReminders from '@/hooks/useDeviceReminders';
import { refreshSubscription } from '@/lib/pushNotifications';
import GrantCard from '@/components/grants/GrantCard';
import GrantFormDialog from '@/components/grants/GrantFormDialog';
import GrantSummary from '@/components/grants/GrantSummary';
import GrantToolbar, { emptyFilters } from '@/components/grants/GrantToolbar';
import ImportDialog from '@/components/grants/ImportDialog';
import { grantsApi, isCaseworker, effectiveStatus, requirementGrantId, grantName } from '@/lib/grants';
import { nextDeadline, daysUntil, isThisMonth, isOverdue } from '@/lib/deadlines';

export default function GrantsModule({ user }) {
  const [grants, setGrants] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [audit, setAudit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [importing, setImporting] = useState(false);
  const [reminderSettings, setReminderSettings] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [filters, setFilters] = useState({ ...emptyFilters });
  const allowed = isCaseworker(user);

  const load = async () => {
    setError(null);
    try {
      const [grantsResult, requirementsResult] = await Promise.all([
        grantsApi.listGrants(),
        grantsApi.listRequirements()
      ]);
      setGrants(grantsResult.grants || []);
      setRequirements(requirementsResult.requirements || []);
    } catch (loadError) {
      setError(loadError.message || 'We could not load grants just now.');
    }
    setLoading(false);
  };

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed]);
  useDeviceReminders(allowed && !loading);

  // Keeps this device subscribed to push, and opens the grant a notification points at.
  useEffect(() => {
    if (!allowed) return;
    refreshSubscription();
  }, [allowed]);

  useEffect(() => {
    if (loading || !grants.length) return;
    const wanted = new URLSearchParams(window.location.search).get('grant');
    if (wanted && grants.some(g => g.id === wanted)) openGrant(wanted);
  }, [loading, grants]);

  const openGrant = async (grantId) => {
    setAssistantOpen(false);
    setExpanded(grantId);
    if (!audit[grantId]) {
      const result = await grantsApi.listAudit(grantId);
      setAudit(current => ({ ...current, [grantId]: result.audit || [] }));
    }
    requestAnimationFrame(() => {
      document.getElementById(`grant-${grantId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const requirementsFor = (grantId) => requirements.filter(r => requirementGrantId(r) === grantId);

  const toggle = async (grant) => {
    const opening = expanded !== grant.id;
    setExpanded(opening ? grant.id : null);
    if (opening && !audit[grant.id]) {
      const result = await grantsApi.listAudit(grant.id);
      setAudit(current => ({ ...current, [grant.id]: result.audit || [] }));
    }
  };

  const save = async (form) => {
    if (dialog.grant) await grantsApi.updateGrant(dialog.grant.id, form);
    else await grantsApi.createGrant(form);
    setDialog(null);
    setAudit({});
    load();
  };

  const remove = async (grant) => {
    await grantsApi.deleteGrant(grant.id);
    if (expanded === grant.id) setExpanded(null);
    load();
  };

  const types = useMemo(() => [...new Set(grants.map(g => g.grantType).filter(Boolean))], [grants]);
  const people = useMemo(() => [...new Set(grants.map(g => g.personInCharge).filter(Boolean))], [grants]);

  const metrics = useMemo(() => {
    const active = grants.filter(g => g.grantStatus === 'Active');
    const deadlineDates = grants.flatMap(g => [g.applicationDueDate, g.acquittalDueDate, g.renewalDate || g.renewal_date])
      .concat(requirements.filter(r => effectiveStatus(r) !== 'Completed').map(r => r.dueDate || r.due_date));
    return {
      activeGrants: active.length,
      activeFunding: new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
        .format(active.reduce((total, g) => total + Number(g.grantAmount ?? g.amount ?? 0), 0)),
      deadlinesThisMonth: deadlineDates.filter(isThisMonth).length,
      overdueActions: requirements.filter(r => effectiveStatus(r) === 'Overdue').length
    };
  }, [grants, requirements]);

  const visible = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const matches = (grant) => {
      if (term) {
        const haystack = [grant.grantName || grant.name, grant.funderName || grant.funder, grant.personInCharge, grant.grantReferenceNumber]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (filters.status && grant.grantStatus !== filters.status) return false;
      if (filters.grantType && grant.grantType !== filters.grantType) return false;
      if (filters.personInCharge && grant.personInCharge !== filters.personInCharge) return false;
      const outstanding = requirementsFor(grant.id).filter(r => effectiveStatus(r) !== 'Completed');
      if (filters.deadline === 'overdue') {
        const grantOverdue = [grant.applicationDueDate, grant.acquittalDueDate, grant.renewalDate || grant.renewal_date].some(isOverdue);
        if (!grantOverdue && !outstanding.some(r => effectiveStatus(r) === 'Overdue')) return false;
      }
      if (filters.deadline === 'upcoming') {
        const deadline = nextDeadline(grant, outstanding);
        const days = deadline ? daysUntil(deadline.date) : null;
        if (days === null || days < 0 || days > 30) return false;
      }
      return true;
    };

    const sorted = grants.filter(matches);
    const deadlineOf = (grant) => {
      const deadline = nextDeadline(grant, requirementsFor(grant.id).filter(r => effectiveStatus(r) !== 'Completed'));
      return deadline ? deadline.date : '9999-12-31';
    };
    if (filters.sort === 'name') sorted.sort((a, b) => grantName(a).localeCompare(grantName(b)));
    if (filters.sort === 'amount') sorted.sort((a, b) => Number(b.grantAmount ?? b.amount ?? 0) - Number(a.grantAmount ?? a.amount ?? 0));
    if (filters.sort === 'updated') sorted.sort((a, b) => String(b.updated_date).localeCompare(String(a.updated_date)));
    if (filters.sort === 'deadline') sorted.sort((a, b) => deadlineOf(a).localeCompare(deadlineOf(b)));
    return sorted;
  }, [grants, requirements, filters]);

  if (!allowed) {
    return (
      <section className="rounded-2xl border border-[#E5D6C8] bg-white p-8 text-center">
        <ShieldAlert className="mx-auto text-[#A45846]" />
        <h1 className="mt-3 text-2xl font-semibold">Grants are for caseworkers</h1>
        <p className="mt-2 text-[#756760]">This area holds funding and compliance records, so it is only available to paid caseworkers.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">Grant compliance</h1>
          <p className="text-[#756760]">Keep renewals, acquittals and evidence on track.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAssistantOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] bg-white px-4 py-2 text-[#7D4037]">
            <Sparkles size={18} /> Ask about your grants
          </button>
          <button onClick={() => setReminderSettings(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] bg-white px-4 py-2 text-[#7D4037]">
            <Settings size={18} /> Grant Reminder Settings
          </button>
          <button onClick={() => setImporting(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] bg-white px-4 py-2 text-[#7D4037]">
            <FileSpreadsheet size={18} /> Import spreadsheet
          </button>
          <button onClick={() => setDialog({})} className="rounded-xl bg-[#A45846] px-4 py-2 text-white">
            <Plus className="inline" size={18} /> Add grant
          </button>
        </div>
      </header>

      <GrantSummary metrics={metrics} />
      <GrantToolbar filters={filters} onChange={setFilters} types={types} people={people} />

      {loading && <p className="mt-6 rounded-2xl bg-white p-8 text-center text-[#756760]">Loading grants…</p>}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-[#E4B5AA] bg-[#FCF3F1] p-6 text-center">
          <p className="text-[#8A2E1D]">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#7D4037] px-4 py-2 text-white">
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 grid gap-4">
          {visible.map(grant => (
            <GrantCard
              key={grant.id}
              grant={grant}
              requirements={requirementsFor(grant.id)}
              audit={audit[grant.id]}
              expanded={expanded === grant.id}
              onToggle={() => toggle(grant)}
              onEdit={() => setDialog({ grant })}
              onDelete={() => remove(grant)}
              refresh={() => { setAudit(current => ({ ...current, [grant.id]: undefined })); load(); }}
            />
          ))}

          {!grants.length && (
            <div className="rounded-2xl border border-[#E5D6C8] bg-white p-8 text-center">
              <p className="text-[#756760]">No grants have been added yet.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button onClick={() => setDialog({})} className="rounded-xl bg-[#A45846] px-4 py-2 text-white"><Plus className="inline" size={18} /> Add grant</button>
                <button onClick={() => setImporting(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D6C8] px-4 py-2 text-[#7D4037]">
                  <FileSpreadsheet size={18} /> Import spreadsheet
                </button>
              </div>
            </div>
          )}

          {!!grants.length && !visible.length && (
            <p className="rounded-2xl bg-white p-8 text-center text-[#756760]">No grants match these filters.</p>
          )}
        </div>
      )}

      {dialog && <GrantFormDialog open grant={dialog.grant} onClose={() => setDialog(null)} onSave={save} />}
      {reminderSettings && <ReminderSettingsDialog onClose={() => setReminderSettings(false)} />}
      {assistantOpen && <AssistantPanel onClose={() => setAssistantOpen(false)} onOpenGrant={openGrant} />}

      {!assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#A45846] px-5 py-3 text-white shadow-lg"
        >
          <Sparkles size={18} /> <span className="hidden sm:inline">Grant Assistant</span>
        </button>
      )}
      {importing && (
        <ImportDialog
          grants={grants}
          onClose={() => setImporting(false)}
          onImported={() => { setAudit({}); load(); }}
        />
      )}
    </section>
  );
}