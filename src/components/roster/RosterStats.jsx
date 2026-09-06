export default function RosterStats({ stats }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className={`rounded-2xl border px-5 py-4 ${stat.tone || 'border-[#E5D6C8] bg-white'}`}>
          <p className={`text-2xl font-semibold ${stat.tone ? '' : 'text-[#7D4037]'}`}>{stat.value}</p>
          <p className={`mt-1 text-sm ${stat.tone ? 'opacity-90' : 'text-[#756760]'}`}>{stat.label}</p>
        </div>
      ))}
    </div>
  );
}