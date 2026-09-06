import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import SupportingDocsChecklist from './SupportingDocsChecklist';

/** Saved letters, each with its supporting-documents checklist. */
export default function SupportLetterList() {
  const [letters, setLetters] = useState([]);

  useEffect(() => { base44.entities.SupportLetter.list('-created_date', 50).then(setLetters); }, []);

  if (!letters.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Letters and their supporting documents</h2>
      <div className="mt-3 space-y-3">
        {letters.map(letter => (
          <article key={letter.id} className="rounded-2xl border border-[#E4D3C3] bg-white p-5">
            <p className="text-sm font-semibold text-[#3D342F]">{letter.subject || letter.letter_type}</p>
            <p className="text-xs text-[#8A7C74]">
              {letter.client_reference} · {letter.letter_type.replace('_', ' ')}
              {letter.recipient_type ? ` · ${letter.recipient_type}` : ''}
            </p>
            <div className="mt-3"><SupportingDocsChecklist letter={letter} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}