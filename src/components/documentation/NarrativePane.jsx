const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Shows the original narrative with the active field's source sentences highlighted. */
export default function NarrativePane({ narrative, highlights }) {
  const active = (highlights || []).filter(sentence => sentence && narrative.includes(sentence));

  const segments = active.length
    ? narrative.split(new RegExp(`(${active.map(escape).join('|')})`, 'g'))
    : [narrative];

  return (
    <div className="rounded-2xl border border-[#E4D3C3] bg-[#FDFBF7] p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-[#7D4037]">Source narrative</p>
      <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[#3D342F]">
        {segments.map((segment, index) =>
          active.includes(segment)
            ? <mark key={index} className="rounded bg-[#F7D9A8] px-0.5">{segment}</mark>
            : <span key={index}>{segment}</span>
        )}
      </div>
      {!active.length && <p className="mt-3 text-xs text-[#8A7C74]">Hover or tap a field to highlight the sentences it came from.</p>}
    </div>
  );
}