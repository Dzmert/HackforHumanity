import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import SignInForm from './SignInForm';

export default function SignInModule({ role }) {
  const isVolunteer = role === 'volunteer';
  const [signIns, setSignIns] = useState([]);

  const load = () => {
    if (isVolunteer) return;
    base44.entities.SignIn.list('-sign_in_time', 50).then(setSignIns);
  };
  useEffect(load, [isVolunteer]);

  return (
    <section>
      <h1 className="font-heading text-3xl font-semibold text-[#7D4037]">Sign-in desk</h1>
      <p className="text-[#756760]">Welcome her in, note why she's come, and route her to the right person.</p>

      <div className="mt-6"><SignInForm onSaved={load} /></div>

      {isVolunteer ? (
        <p className="mt-6 text-sm text-[#8A7C74]">Sign-in records are visible to caseworkers and managers.</p>
      ) : (
        <>
          <h2 className="mt-8 text-xl font-semibold">Today at the door</h2>
          <div className="mt-3 space-y-2">
            {signIns.map(record => (
              <article key={record.id} className="rounded-xl border border-[#EFE2D6] bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-x-3">
                  <b className="text-[#3D342F]">{record.client_name}</b>
                  <span className="text-xs text-[#8A7C74]">{format(new Date(record.sign_in_time), 'd MMM, h:mm a')}</span>
                  {record.specialisation_mismatch && (
                    <span className="rounded-full bg-[#FFF0E4] px-2 py-0.5 text-xs text-[#7D4037]">
                      Different area to caseworker on shift
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[#6B5D55]">{record.reason_for_visit}</p>
                <p className="mt-1 text-xs text-[#8A7C74]">
                  Preliminary guess: {record.inferred_specialisation || 'General'} — pending confirmation
                  {record.assigned_caseworker_name && ` · on shift: ${record.assigned_caseworker_name}`}
                </p>
              </article>
            ))}
            {!signIns.length && <p className="text-sm text-[#8A7C74]">No sign-ins recorded yet.</p>}
          </div>
        </>
      )}
    </section>
  );
}