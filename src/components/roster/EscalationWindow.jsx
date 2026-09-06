export default function EscalationWindow({ hours, onChange }) {
  return (
    <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#756760]">
      Escalate an unclaimed shift after
      <select
        value={hours}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-[#E5D6C8] bg-white px-3 py-2 text-sm text-[#7D4037]"
      >
        {[1, 2, 4, 8, 24].map((option) => (
          <option key={option} value={option}>{option} {option === 1 ? 'hour' : 'hours'}</option>
        ))}
      </select>
      without a standby volunteer.
    </label>
  );
}