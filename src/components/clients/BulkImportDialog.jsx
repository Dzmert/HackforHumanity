import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, Download } from 'lucide-react';
import { parseClientCsv, buildPreview, SAMPLE_CSV } from '@/lib/clientImport';
import ImportPreviewTable from './ImportPreviewTable';

export default function BulkImportDialog({ open, onOpenChange, existingClients, onImported }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setPreview(null); setError(''); };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    const rows = parseClientCsv(await file.text());
    if (rows.length === 0) {
      setError('No client rows found. The file needs a Name column with at least one value.');
      return;
    }
    setPreview(buildPreview(rows, existingClients));
  };

  const loadSample = () => setPreview(buildPreview(parseClientCsv(SAMPLE_CSV), existingClients));

  const downloadSample = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }));
    link.download = 'lous-place-sample-clients.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const toggle = (key) => setPreview(current => current.map(entry => entry.key === key ? { ...entry, include: !entry.include } : entry));

  const confirmImport = async () => {
    const chosen = preview.filter(entry => entry.include);
    if (chosen.length === 0) { setError('Select at least one row to import.'); return; }
    setSaving(true);
    setError('');
    try {
      await base44.entities.Client.bulkCreate(chosen.map(entry => ({
        ...entry.row,
        reference_code: entry.row.reference_code || entry.generatedCode
      })));
      reset();
      onOpenChange(false);
      onImported();
    } catch (importError) {
      setError(importError?.message || 'The import could not be saved.');
    }
    setSaving(false);
  };

  const flagged = preview ? preview.filter(entry => entry.duplicateOf).length : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-4xl bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="text-[#7D4037]">Bulk import clients</DialogTitle>
          <DialogDescription>
            Nothing is saved until you review the list below and confirm. Possible duplicates are unticked for you.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E4D3C3] bg-white p-8 text-center">
              <Upload className="text-[#7D4037]" />
              <span className="font-medium">Choose a CSV file</span>
              <span className="text-xs text-[#8A7C74]">Columns: Name, Reference Code, Pronouns, Preferred Contact Method, Assigned Caseworker, Notes</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadSample}>Preview the sample client list</Button>
              <Button variant="ghost" onClick={downloadSample}><Download size={16} className="mr-2" />Download sample CSV</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#6B5D55]">
              {preview.length} rows read · <b>{flagged}</b> flagged as possible duplicates · {preview.filter(entry => entry.include).length} ticked to import
            </p>
            <ImportPreviewTable preview={preview} onToggle={toggle} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={reset}>Choose a different file</Button>
              <Button className="bg-[#CF664A] hover:bg-[#B9573D]" onClick={confirmImport} disabled={saving}>
                {saving ? 'Importing…' : `Import ${preview.filter(entry => entry.include).length} clients`}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[#B3261E]">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}