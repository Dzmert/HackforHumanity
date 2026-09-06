import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PsmNoteCard from '@/components/psm/PsmNoteCard';

const RISK_ORDER = { High: 0, Medium: 1, Low: 2 };

/** Route-guarded review dashboard: project services manager and admin only. */
export default function PsmReview() {
  const { user } = useAuth();
  const [notes, setNotes] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const allowed = ['project_services_manager', 'admin'].includes(user?.role);

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      base44.entities.CaseNote.filter({ status: 'complete' }, '-note_date', 200),
      base44.entities.ClientCoverage.list('-created_date', 500)
    ]).then(([completeNotes, coverageRecords]) => {
      setNotes([...completeNotes].sort((a, b) =>
        (RISK_ORDER[a.safety_risk_level] ?? 3) - (RISK_ORDER[b.safety_risk_level] ?? 3) ||
        String(b.note_date).localeCompare(String(a.note_date))
      ));
      setCoverage(coverageRecords);
    });
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8F1E8] p-6 text-center">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#7D4037]">This review dashboard isn't open to you</h1>
          <p className="mt-2 text-sm text-[#6B5D55]">Case note review is held by the project services manager.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-[#7D4037] px-4 py-2 text-sm text-white">Back to the hub</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F1E8] p-4 text-[#3D342F] md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-[#7D4037] underline">Back to the hub</Link>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-[#7D4037]">Case note review</h1>
        <p className="text-[#756760]">Completed notes, with higher safety risk brought to the top.</p>

        <div className="mt-6 space-y-4">
          {!notes && <p className="text-sm text-[#8A7C74]">Loading notes…</p>}
          {notes?.map(note => (
            <PsmNoteCard key={note.id} note={note} coverage={coverage.filter(record => record.client_id === note.client_id)} />
          ))}
          {notes && !notes.length && <p className="text-sm text-[#8A7C74]">No completed notes to review yet.</p>}
        </div>
      </div>
    </div>
  );
}