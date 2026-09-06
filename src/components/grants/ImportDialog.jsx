import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import ImportMappingStep from '@/components/grants/ImportMappingStep';
import ImportPreviewStep from '@/components/grants/ImportPreviewStep';
import { readSpreadsheet } from '@/lib/spreadsheet';
import { suggestMapping, buildRow, findDuplicate, mergeForUpdate } from '@/lib/grantImport';
import { grantsApi } from '@/lib/grants';

const buildRows = (headers, cells, mapping, grants) => cells.map((row, index) => {
  const { values, errors, warnings } = buildRow(headers, row, mapping);
  const duplicate = errors.length ? null : findDuplicate(values, grants);
  return { index, values, errors, warnings, duplicate, action: duplicate ? 'skip' : 'create' };
});

export default function ImportDialog({ grants, onClose, onImported }) {
  const [step, setStep] = useState('file');
  const [table, setTable] = useState(null);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await readSpreadsheet(file);
      const suggested = suggestMapping(parsed.headers);
      setTable(parsed);
      setMapping(suggested);
      setStep('mapping');
    } catch (readError) {
      setError(readError.message || 'We could not read that file.');
    }
    setBusy(false);
  };

  const toPreview = () => {
    setRows(buildRows(table.headers, table.rows, mapping, grants));
    setStep('preview');
  };

  const setAction = (index, action) =>
    setRows(current => current.map(row => (row.index === index ? { ...row, action } : row)));

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };
    try {
      for (const row of rows) {
        if (row.errors.length || row.action === 'skip') { counts.skipped += 1; continue; }
        try {
          if (row.action === 'update' && row.duplicate) {
            await grantsApi.updateGrant(row.duplicate.grant.id, mergeForUpdate(row.values, row.duplicate.grant));
            counts.updated += 1;
          } else {
            await grantsApi.createGrant(row.values);
            counts.created += 1;
          }
        } catch {
          counts.failed += 1;
        }
      }
      setResult(counts);
      setStep('done');
      onImported();
    } catch (importError) {
      setError(importError.message || 'The import could not be completed.');
    }
    setBusy(false);
  };

  const importable = rows.filter(row => !row.errors.length && row.action !== 'skip').length;
  const blocked = rows.filter(row => row.errors.length).length;

  return (
    <Dialog open onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-[#FDFBF7]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-[#3D342F]">Import grants from a spreadsheet</DialogTitle>
        </DialogHeader>

        {error && <p className="rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-3 text-sm text-[#8A2E1D]">{error}</p>}

        {step === 'file' && (
          <div className="rounded-2xl border border-dashed border-[#E5D6C8] bg-white p-8 text-center">
            <FileSpreadsheet className="mx-auto text-[#A45846]" />
            <p className="mt-3 text-[#756760]">Choose a .csv or .xlsx file. The first row should hold your column headings.</p>
            <label className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#A45846] px-5 py-3 text-white ${busy ? 'opacity-60' : ''}`}>
              {busy ? 'Reading file…' : 'Choose spreadsheet'}
              <input type="file" accept=".csv,.xlsx,.xls" onChange={choose} disabled={busy} className="hidden" />
            </label>
          </div>
        )}

        {step === 'mapping' && table && (
          <>
            <ImportMappingStep headers={table.headers} rows={table.rows} mapping={mapping} onChange={setMapping} />
            <div className="flex flex-wrap gap-3">
              <button onClick={toPreview} className="rounded-xl bg-[#7D4037] px-5 py-3 text-white">Preview {table.rows.length} rows</button>
              <button onClick={() => setStep('file')} className="rounded-xl px-5 py-3 text-[#A45846]">Choose another file</button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <p className="text-sm text-[#756760]">
              {importable} row{importable === 1 ? '' : 's'} ready to import
              {blocked ? ` · ${blocked} row${blocked === 1 ? '' : 's'} skipped because of errors` : ''}.
            </p>
            <ImportPreviewStep rows={rows} onAction={setAction} />
            <div className="flex flex-wrap gap-3">
              <button disabled={busy || !importable} onClick={confirm} className="rounded-xl bg-[#7D4037] px-5 py-3 text-white disabled:opacity-60">
                {busy ? 'Importing…' : `Import ${importable} grant${importable === 1 ? '' : 's'}`}
              </button>
              <button onClick={() => setStep('mapping')} className="rounded-xl px-5 py-3 text-[#A45846]">Back to column matching</button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <div className="rounded-2xl border border-[#E5D6C8] bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto text-[#3D5A3A]" />
            <p className="mt-3 text-[#3D342F]">
              {result.created} grant{result.created === 1 ? '' : 's'} added, {result.updated} updated, {result.skipped} skipped
              {result.failed ? `, ${result.failed} could not be saved` : ''}.
            </p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-[#A45846] px-5 py-3 text-white">Done</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}