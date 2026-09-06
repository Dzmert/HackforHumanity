import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import GrantDetails from '@/components/grants/GrantDetails';
import { grantName, displayAmount, effectiveStatus, display } from '@/lib/grants';
import { nextDeadline, formatDate, countdownLabel, countdownTone } from '@/lib/deadlines';

export default function GrantCard({ grant, requirements, audit, expanded, onToggle, onEdit, onDelete, refresh }) {
  const [confirming, setConfirming] = useState(false);
  const outstanding = requirements.filter(r => effectiveStatus(r) !== 'Completed');
  const deadline = nextDeadline(grant, outstanding);

  return (
    <article id={`grant-${grant.id}`} className="scroll-mt-4 rounded-2xl border border-[#E5D6C8] bg-white p-5">
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <h2 className="break-words text-lg font-semibold text-[#3D342F]">{grantName(grant)}</h2>
          <p className="mt-1 text-[#7D4037]">{displayAmount(grant.grantAmount ?? grant.amount)}</p>
          {deadline
            ? <>
                <p className="mt-1 text-sm text-[#756760]">{deadline.label}: {formatDate(deadline.date)}</p>
                <p className={`text-sm ${countdownTone(deadline.date)}`}>{countdownLabel(deadline.date)}</p>
              </>
            : <p className="mt-1 text-sm text-[#756760]">No upcoming deadline</p>}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F6E1D3] px-3 py-1 text-sm text-[#7D4037]">{display(grant.grantStatus)}</span>
          <button onClick={onEdit} aria-label="Edit grant" className="p-1 text-[#A45846]"><Pencil size={18} /></button>
          <button onClick={() => setConfirming(true)} aria-label="Delete grant" className="p-1 text-[#756760]"><Trash2 size={18} /></button>
          <button onClick={onToggle} aria-label={expanded ? 'Collapse grant' : 'Expand grant'} className="p-1 text-[#A45846]">
            <ChevronDown size={20} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {confirming && (
        <div className="mt-4 rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-4 text-sm">
          <p className="text-[#8A2E1D]">Delete “{grantName(grant)}” and its compliance requirements? This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button onClick={async () => { setConfirming(false); await onDelete(); }} className="rounded-lg bg-[#8A2E1D] px-4 py-2 text-white">Delete grant</button>
            <button onClick={() => setConfirming(false)} className="rounded-lg px-4 py-2 text-[#756760]">Keep it</button>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <GrantDetails grant={grant} requirements={requirements} audit={audit} refresh={refresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}