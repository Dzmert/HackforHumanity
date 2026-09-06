import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, Users } from 'lucide-react';
import BulkImportDialog from './BulkImportDialog';
import CoveragePanel from './CoveragePanel';
import { visibleClientColumns } from './clientFields';

export default function ClientsModule({ clients, role, refresh }) {
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const isVolunteer = role === 'volunteer';
  const columns = visibleClientColumns(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#7D4037]">Client profiles</h1>
          <p className="text-sm text-[#6B5D55]">{clients.length} {clients.length === 1 ? 'profile' : 'profiles'} on record</p>
        </div>
        {!isVolunteer && (
          <Button className="bg-[#CF664A] hover:bg-[#B9573D]" onClick={() => setImporting(true)}>
            <UploadCloud size={17} className="mr-2" />Bulk import clients
          </Button>
        )}
      </div>

      {isVolunteer && (
        <p className="rounded-xl border border-[#E4D3C3] bg-[#F8F1E8] p-4 text-sm text-[#6B5D55]">
          You're seeing the basic details only. Contact preferences, caseworker allocation and case notes are kept for paid staff.
        </p>
      )}

      {clients.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-[#E4D3C3] bg-white p-12 text-center">
          <Users className="text-[#C9B6A8]" size={30} />
          <p className="font-medium">No client profiles yet</p>
          <p className="max-w-sm text-sm text-[#8A7C74]">
            {isVolunteer
              ? 'There are no client profiles to show at the moment.'
              : "Import an existing client list from a CSV to get started — you'll be able to review every row before anything is saved."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E4D3C3] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F1E8] text-xs uppercase tracking-wide text-[#7D4037]">
              <tr>{columns.map(column => <th key={column.field} className="p-3">{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr
                  key={client.id}
                  onClick={() => !isVolunteer && setSelected(selected?.id === client.id ? null : client)}
                  className={`border-t border-[#EFE2D6] ${isVolunteer ? '' : 'cursor-pointer hover:bg-[#FDFBF7]'} ${selected?.id === client.id ? 'bg-[#FDFBF7]' : ''}`}
                >
                  {columns.map((column, index) => (
                    <td key={column.field} className={`p-3 ${index === 0 ? 'font-medium' : 'text-[#6B5D55]'}`}>
                      {client[column.field] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isVolunteer && selected && (
        <div className="rounded-2xl border border-[#E4D3C3] bg-white p-5">
          <p className="mb-3 text-sm font-medium text-[#3D342F]">{selected.name}</p>
          <CoveragePanel client={selected} />
        </div>
      )}

      {!isVolunteer && clients.length > 0 && !selected && (
        <p className="text-xs text-[#8A7C74]">Select a client to see their coverage baseline.</p>
      )}

      {!isVolunteer && (
        <BulkImportDialog open={importing} onOpenChange={setImporting} existingClients={clients} onImported={refresh} />
      )}
    </div>
  );
}