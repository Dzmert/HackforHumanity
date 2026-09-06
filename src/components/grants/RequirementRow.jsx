import { CheckCircle2, Circle, AlertTriangle, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { effectiveStatus, display } from '@/lib/grants';
import { formatDate, countdownLabel, countdownTone } from '@/lib/deadlines';

const icons = {
  Completed: <CheckCircle2 size={18} className="text-[#3D5A3A]" />,
  Overdue: <AlertTriangle size={18} className="text-[#8A2E1D]" />,
  'In progress': <Circle size={18} className="text-[#A45846]" />,
  'Not started': <Circle size={18} className="text-[#B6A79D]" />
};

const tone = {
  Overdue: 'bg-[#F3D2CB] text-[#8A2E1D]',
  Completed: 'bg-[#DCE8DA] text-[#3D5A3A]',
  'In progress': 'bg-[#F6E1D3] text-[#7D4037]',
  'Not started': 'bg-[#EFE7DE] text-[#756760]'
};

export default function RequirementRow({ requirement, onComplete, onReopen, onEdit, onDelete }) {
  const status = effectiveStatus(requirement);
  const due = requirement.dueDate || requirement.due_date;
  const completed = status === 'Completed';

  return (
    <div className={`rounded-xl border p-4 ${status === 'Overdue' ? 'border-[#E4B5AA] bg-[#FCF3F1]' : 'border-[#EFE3D6] bg-[#FDFBF7]'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-0.5">{icons[status]}</span>
        <div className="min-w-0 flex-1">
          <p className={`break-words font-medium ${completed ? 'text-[#756760] line-through' : 'text-[#3D342F]'}`}>{display(requirement.title)}</p>
          <p className="mt-1 text-sm text-[#756760]">{display(requirement.requirementType)} · Due: {formatDate(due)}</p>
          {!completed && countdownLabel(due) && <p className={`text-sm ${countdownTone(due)}`}>{countdownLabel(due)}</p>}
          {completed && <p className="text-sm text-[#3D5A3A]">Completed {formatDate(requirement.completionDate)}</p>}
          <p className="mt-1 text-sm text-[#756760]">Responsible: {display(requirement.personResponsible)}</p>
          {requirement.description && <p className="mt-1 break-words text-sm text-[#756760]">{requirement.description}</p>}
          {requirement.notes && <p className="mt-1 break-words text-sm text-[#756760]">Notes: {requirement.notes}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${tone[status]}`}>{status}</span>
          {completed
            ? <button onClick={onReopen} className="flex items-center gap-1 text-sm text-[#A45846]"><RotateCcw size={16} /> Reopen</button>
            : <button onClick={onComplete} className="flex items-center gap-1 text-sm text-[#A45846]"><CheckCircle2 size={16} /> Mark complete</button>}
          <button onClick={onEdit} aria-label="Edit requirement" className="text-[#A45846]"><Pencil size={16} /></button>
          <button onClick={onDelete} aria-label="Delete requirement" className="text-[#756760]"><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
}