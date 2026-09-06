import { base44 } from '@/api/base44Client';
import { grantsApi } from '@/lib/grants';

/** Minimal RFC4180-ish CSV parser: handles quotes, escaped quotes and newlines in cells. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const clean = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(cell); cell = ''; continue; }
    if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += char;
  }
  row.push(cell);
  rows.push(row);

  return rows.filter(r => r.some(value => String(value).trim() !== ''));
}

/** Turns a table of cells into { headers, rows } where the first non-empty row is the header. */
export function toTable(cells) {
  if (!cells.length) throw new Error('That file looks empty.');
  const headers = cells[0].map((header, index) => String(header ?? '').trim() || `Column ${index + 1}`);
  const rows = cells.slice(1).map(row => headers.map((_, index) => {
    const value = row[index];
    return value === undefined || value === null ? '' : String(value).trim();
  }));
  if (!rows.length) throw new Error('We found a header row but no data rows.');
  return { headers, rows };
}

/**
 * Reads a spreadsheet into { headers, rows }.
 * CSV is parsed in the browser; Excel is uploaded and read by the grants function.
 */
export async function readSpreadsheet(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return toTable(parseCsv(await file.text()));
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const { headers, rows } = await grantsApi.parseSpreadsheet(file_url);
    if (!headers?.length || !rows?.length) throw new Error('We could not read any rows from that spreadsheet.');
    return {
      headers: headers.map((header, index) => String(header ?? '').trim() || `Column ${index + 1}`),
      rows: rows.map(row => headers.map((_, index) => String(row?.[index] ?? '').trim()))
    };
  }
  throw new Error('Please choose a .csv or .xlsx file.');
}