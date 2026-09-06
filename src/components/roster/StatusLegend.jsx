import { stateLabels, stateSwatches } from './rosterUtils';

export default function StatusLegend({ states }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#756760]">
      {states.map((state) => (
        <span key={state} className="flex items-center gap-2">
          <i className={`h-3 w-3 rounded ${stateSwatches[state]}`} />
          {stateLabels[state]}
        </span>
      ))}
    </div>
  );
}