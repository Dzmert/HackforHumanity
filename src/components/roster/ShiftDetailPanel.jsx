import { format } from 'date-fns';
import { X } from 'lucide-react';
import { shiftState, stateLabels } from './rosterUtils';

export default function ShiftDetailPanel({ shift, onClose, children }) {
  if (!shift) return null;
  const state = shiftState(shift);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#3D342F]/30" />
      <aside className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[#FDFBF7] p-6 shadow-xl sm:max-h-none sm:h-full sm:w-[400px] sm:rounded-none sm:rounded-l-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.16em] text-[#A45846]">{stateLabels[state]}</p>
            <h2 className="mt-1 text-2xl font-semibold">{shift.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close panel" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5D6C8] bg-white text-[#7D4037]">
            <X size={18} />
          </button>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-[#A08D82]">When</dt>
            <dd className="mt-0.5 font-medium">
              {format(new Date(shift.start_time), 'EEEE d MMMM')}
              <span className="block font-normal text-[#756760]">
                {format(new Date(shift.start_time), 'h:mm a')} – {format(new Date(shift.end_time), 'h:mm a')}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[#A08D82]">Who is covering</dt>
            <dd className="mt-0.5 font-medium">{shift.assigned_volunteer_name || 'Available for a volunteer to claim'}</dd>
          </div>
          {state === 'standby_notified' && shift.previous_volunteer_name && (
            <div>
              <dt className="text-[#A08D82]">Previously covered by</dt>
              <dd className="mt-0.5 text-[#3D342F]">{shift.previous_volunteer_name}, with thanks for the early notice</dd>
            </div>
          )}
          {shift.notes && (
            <div>
              <dt className="text-[#A08D82]">Notes</dt>
              <dd className="mt-0.5 text-[#3D342F]">{shift.notes}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 border-t border-[#EFE3D6] pt-6">{children}</div>
      </aside>
    </div>
  );
}