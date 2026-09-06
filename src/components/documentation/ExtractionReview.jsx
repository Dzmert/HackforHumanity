import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Check } from 'lucide-react';
import { EXTRACTION_FIELDS, buildExtractionPayload } from './extractionFields';
import ExtractionFieldRow from './ExtractionFieldRow';
import NarrativePane from './NarrativePane';

export default function ExtractionReview({ narrative, extraction, onCancel, onConfirm, confirming }) {
  const [values, setValues] = useState(extraction.values);
  const [activeField, setActiveField] = useState(null);
  const sources = extraction.sources;
  const sensitive = values.case_tags?.includes('Domestic & Family Violence');

  return (
    <section className="rounded-2xl border border-[#E5D6C8] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#7D4037]">Review extracted details</h2>
          <p className="mt-1 text-sm text-[#6B5D55]">
            Everything is editable. Nothing is written to the record until you confirm once, below.
          </p>
        </div>
        {sensitive && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#F5E0DA] px-3 py-1 text-xs text-[#7D4037]">
            <ShieldAlert size={14} />Will be filed as Sensitive
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {EXTRACTION_FIELDS.map(field => (
            <ExtractionFieldRow
              key={field.key}
              field={field}
              value={values[field.key]}
              sourceCount={(sources[field.key] || []).length}
              onChange={next => setValues(current => ({ ...current, [field.key]: next }))}
              onFocusField={setActiveField}
            />
          ))}
        </div>
        <NarrativePane narrative={narrative} highlights={activeField ? sources[activeField] : []} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button className="bg-[#7D4037] hover:bg-[#6A342C]" onClick={() => onConfirm(buildExtractionPayload(values, sources))} disabled={confirming}>
          <Check size={17} className="mr-2" />{confirming ? 'Finalizing…' : 'Confirm & Finalize'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={confirming}>Back to the narrative</Button>
      </div>
    </section>
  );
}