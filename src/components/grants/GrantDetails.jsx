import RequirementsSection from '@/components/grants/RequirementsSection';
import DocumentsSection from '@/components/grants/DocumentsSection';
import { display, displayAmount, grantName, grantFunder } from '@/lib/grants';
import { formatDate, countdownLabel, countdownTone } from '@/lib/deadlines';

const Section = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">{title}</h3>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">{children}</dl>
  </div>
);

const Row = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs uppercase tracking-wide text-[#A79488]">{label}</dt>
    <dd className="break-words text-[#3D342F]">{value}</dd>
  </div>
);

const DateRow = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs uppercase tracking-wide text-[#A79488]">{label}</dt>
    <dd className="text-[#3D342F]">{formatDate(value)}</dd>
    {value && <dd className={`text-sm ${countdownTone(value)}`}>{countdownLabel(value)}</dd>}
  </div>
);

export default function GrantDetails({ grant, requirements, audit, refresh }) {
  const website = grant.grantWebsite;
  return (
    <div className="mt-5 grid gap-6 border-t border-[#EFE3D6] pt-5">
      <Section title="Overview">
        <Row label="Grant name" value={grantName(grant)} />
        <Row label="Funder" value={grantFunder(grant)} />
        <Row label="Amount" value={displayAmount(grant.grantAmount ?? grant.amount)} />
        <Row label="Grant type" value={display(grant.grantType)} />
        <Row label="Grant status" value={display(grant.grantStatus)} />
        <Row label="Reference number" value={display(grant.grantReferenceNumber)} />
      </Section>

      <Section title="Dates">
        <DateRow label="Application due" value={grant.applicationDueDate} />
        <DateRow label="Funding start" value={grant.fundingStartDate} />
        <DateRow label="Funding end" value={grant.fundingEndDate} />
        <DateRow label="Acquittal due" value={grant.acquittalDueDate} />
        <DateRow label="Renewal date" value={grant.renewalDate || grant.renewal_date} />
      </Section>

      <Section title="Acquittal">
        <Row label="Acquittal type" value={display(grant.acquittalType)} />
      </Section>

      <Section title="Ownership">
        <Row label="Person in charge" value={display(grant.personInCharge)} />
        <Row label="Their email" value={grant.personInChargeEmail
          ? <a href={`mailto:${grant.personInChargeEmail}`} className="break-all text-[#A45846]">{grant.personInChargeEmail}</a>
          : 'N/A'} />
      </Section>

      <Section title="Details">
        <div className="sm:col-span-2"><Row label="Grant purpose" value={display(grant.grantPurpose)} /></div>
        <Row label="Grant website" value={website
          ? <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="break-all text-[#A45846]">{website}</a>
          : 'N/A'} />
        <div className="sm:col-span-2"><Row label="Additional notes" value={display(grant.additionalNotes || grant.notes)} /></div>
      </Section>

      <RequirementsSection grantId={grant.id} requirements={requirements} refresh={refresh} />

      <DocumentsSection grantId={grant.id} requirements={requirements} />

      {!!audit?.length && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">Change history</h3>
          <ul className="mt-3 grid gap-2 text-sm text-[#756760]">
            {audit.map(entry => (
              <li key={entry.id} className="break-words">
                <span className="font-medium text-[#3D342F]">{display(entry.actorName)}</span> {entry.summary}
                {entry.newValue ? <> · {entry.previousValue || 'empty'} → {entry.newValue}</> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="System information">
        <Row label="Created by" value={display(grant.createdBy)} />
        <Row label="Created at" value={formatDate(grant.created_date)} />
        <Row label="Last updated by" value={display(grant.updatedBy)} />
        <Row label="Last updated at" value={formatDate(grant.updated_date)} />
      </Section>
    </div>
  );
}