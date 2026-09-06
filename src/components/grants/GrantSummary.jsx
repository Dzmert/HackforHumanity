import { BadgeDollarSign, Wallet, CalendarClock, AlertTriangle } from 'lucide-react';

const cards = [
  ['Active grants', 'activeGrants', BadgeDollarSign],
  ['Total active funding', 'activeFunding', Wallet],
  ['Deadlines this month', 'deadlinesThisMonth', CalendarClock],
  ['Overdue actions', 'overdueActions', AlertTriangle]
];

export default function GrantSummary({ metrics }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, key, Icon]) => (
        <div key={key} className="rounded-2xl border border-[#E5D6C8] bg-white p-4">
          <Icon size={18} className="text-[#A45846]" />
          <p className="mt-2 text-2xl font-semibold text-[#3D342F]">{metrics[key]}</p>
          <p className="text-sm text-[#756760]">{label}</p>
        </div>
      ))}
    </div>
  );
}