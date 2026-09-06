import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { PackageMinus } from 'lucide-react';

export default function RecordUsage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ supply_item: '', storage_location: '', quantity: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [supplyItems, storageLocations] = await Promise.all([
        base44.entities.SupplyItem.list('item_name', 200),
        base44.entities.StorageLocation.list('name', 200)
      ]);
      setItems(supplyItems);
      setLocations(storageLocations);
    })();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Please enter a quantity greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.StockMovement.create({
        supply_item: form.supply_item,
        storage_location: form.storage_location,
        quantity_delta: -quantity,
        movement_type: 'distribution',
        user: user?.id,
        timestamp: new Date().toISOString()
      });
      setForm({ ...form, quantity: '' });
      setMessage('Usage recorded.');
    } catch (submitError) {
      setError(submitError?.message || 'Unable to record usage.');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F1E8] p-6 text-[#3D342F]">
      <div className="mx-auto max-w-xl">
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <PackageMinus className="text-[#A45846]" /> Record usage
        </h1>
        <p className="mt-2 text-[#756760]">Record items given out or used, so stock stays accurate.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-[#E5D6C8] bg-white p-6">
          <label className="grid gap-1 text-sm font-medium">Item
            <select required value={form.supply_item} onChange={e => setForm({ ...form, supply_item: e.target.value })} className="rounded-xl border border-[#E5D6C8] p-3">
              <option value="">Choose an item</option>
              {items.map(item => <option key={item.id} value={item.id}>{item.item_name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">Location
            <select required value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })} className="rounded-xl border border-[#E5D6C8] p-3">
              <option value="">Choose a location</option>
              {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">Quantity used
            <input required type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="rounded-xl border border-[#E5D6C8] p-3" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-[#4B7A52]">{message}</p>}
          <button disabled={saving} className="rounded-xl bg-[#A45846] px-4 py-3 font-medium text-white disabled:opacity-60">
            {saving ? 'Recording…' : 'Record usage'}
          </button>
        </form>
      </div>
    </div>
  );
}