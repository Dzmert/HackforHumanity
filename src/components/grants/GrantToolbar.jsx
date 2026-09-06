import { Search, X } from 'lucide-react';
import { GRANT_STATUSES } from '@/lib/grants';

const control = 'rounded-xl border border-[#E5D6C8] bg-white p-2.5 text-sm text-[#3D342F] focus:border-[#A45846] focus:outline-none';

export const emptyFilters = {
  search: '', status: '', grantType: '', personInCharge: '', deadline: '', sort: 'deadline'
};

export default function GrantToolbar({ filters, onChange, types, people }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });
  const dirty = Object.keys(emptyFilters).some(key => filters[key] !== emptyFilters[key]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search size={16} className="absolute left-3 top-3 text-[#A79488]" />
        <input
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="Search name, funder, person or reference"
          className={`${control} w-full pl-9`}
        />
      </div>
      <select value={filters.status} onChange={e => set('status', e.target.value)} className={control}>
        <option value="">All statuses</option>
        {GRANT_STATUSES.map(status => <option key={status}>{status}</option>)}
      </select>
      <select value={filters.grantType} onChange={e => set('grantType', e.target.value)} className={control}>
        <option value="">All types</option>
        {types.map(type => <option key={type}>{type}</option>)}
      </select>
      <select value={filters.personInCharge} onChange={e => set('personInCharge', e.target.value)} className={control}>
        <option value="">All people</option>
        {people.map(person => <option key={person}>{person}</option>)}
      </select>
      <select value={filters.deadline} onChange={e => set('deadline', e.target.value)} className={control}>
        <option value="">Any deadline</option>
        <option value="upcoming">Upcoming (30 days)</option>
        <option value="overdue">Overdue</option>
      </select>
      <select value={filters.sort} onChange={e => set('sort', e.target.value)} className={control}>
        <option value="deadline">Nearest deadline</option>
        <option value="name">Grant name</option>
        <option value="amount">Grant amount</option>
        <option value="updated">Recently updated</option>
      </select>
      {dirty && (
        <button onClick={() => onChange({ ...emptyFilters })} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-[#A45846]">
          <X size={14} /> Clear filters
        </button>
      )}
    </div>
  );
}