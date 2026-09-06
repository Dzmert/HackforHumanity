import { useState } from 'react';
import { Plus } from 'lucide-react';
import RequirementRow from '@/components/grants/RequirementRow';
import RequirementFormDialog from '@/components/grants/RequirementFormDialog';
import { grantsApi } from '@/lib/grants';

export default function RequirementsSection({ grantId, requirements, refresh }) {
  const [dialog, setDialog] = useState(null); // { requirement } | { }
  const [confirming, setConfirming] = useState(null);

  const save = async (form) => {
    if (dialog.requirement) await grantsApi.updateRequirement(dialog.requirement.id, form);
    else await grantsApi.createRequirement({ ...form, grantId });
    setDialog(null);
    refresh();
  };

  const act = async (promise) => { await promise; refresh(); };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">Compliance requirements</h3>
        <button onClick={() => setDialog({})} className="flex items-center gap-1 text-sm font-medium text-[#A45846]"><Plus size={16} /> Add requirement</button>
      </div>

      <div className="mt-3 grid gap-3">
        {requirements.map(requirement => (
          <RequirementRow
            key={requirement.id}
            requirement={requirement}
            onComplete={() => act(grantsApi.completeRequirement(requirement.id))}
            onReopen={() => act(grantsApi.reopenRequirement(requirement.id))}
            onEdit={() => setDialog({ requirement })}
            onDelete={() => setConfirming(requirement)}
          />
        ))}
        {!requirements.length && <p className="rounded-xl border border-dashed border-[#E5D6C8] p-4 text-sm text-[#756760]">No compliance requirements added.</p>}
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-4 text-sm">
          <p className="text-[#8A2E1D]">Delete “{confirming.title}”? This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button onClick={async () => { await grantsApi.deleteRequirement(confirming.id); setConfirming(null); refresh(); }} className="rounded-lg bg-[#8A2E1D] px-4 py-2 text-white">Delete</button>
            <button onClick={() => setConfirming(null)} className="rounded-lg px-4 py-2 text-[#756760]">Keep it</button>
          </div>
        </div>
      )}

      {dialog && (
        <RequirementFormDialog
          open
          requirement={dialog.requirement}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}
    </div>
  );
}