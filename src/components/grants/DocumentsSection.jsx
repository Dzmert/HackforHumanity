import { useEffect, useState } from 'react';
import { FileText, Upload, Trash2, Download, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { grantsApi, display } from '@/lib/grants';
import { formatDate } from '@/lib/deadlines';

export const DOCUMENT_CATEGORIES = [
  'Funding Agreement', 'Original Application', 'Budget', 'Progress Report',
  'Financial Report', 'Acquittal Report', 'Receipts / Expenditure Evidence',
  'Outcome Report', 'Other'
];

const control = 'rounded-xl border border-[#E5D6C8] bg-white p-2.5 text-sm text-[#3D342F] focus:border-[#A45846] focus:outline-none';

const readableSize = (bytes) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function DocumentsSection({ grantId, requirements }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('Funding Agreement');
  const [requirementId, setRequirementId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const result = await grantsApi.listDocuments(grantId);
      setDocuments(result.documents || []);
    } catch (loadError) {
      setError(loadError.message || 'We could not load documents just now.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [grantId]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await grantsApi.createDocument({
        grantId,
        requirementId: requirementId || null,
        filename: file.name,
        fileUrl: file_url,
        fileType: file.type || file.name.split('.').pop(),
        fileSize: file.size,
        documentCategory: category
      });
      await load();
    } catch (uploadError) {
      setError(uploadError.message || 'That file could not be uploaded.');
    }
    setUploading(false);
  };

  const requirementTitle = (id) => requirements.find(r => r.id === id)?.title;

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-[#A45846]">Documents &amp; evidence</h3>

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-[#EFE3D6] bg-[#FDFBF7] p-4">
        <label className="block text-sm text-[#756760]">
          Category
          <select value={category} onChange={e => setCategory(e.target.value)} className={`${control} mt-1 block`}>
            {DOCUMENT_CATEGORIES.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="block text-sm text-[#756760]">
          Attach to
          <select value={requirementId} onChange={e => setRequirementId(e.target.value)} className={`${control} mt-1 block max-w-[260px]`}>
            <option value="">This grant</option>
            {requirements.map(requirement => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}
          </select>
        </label>
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl bg-[#7D4037] px-4 py-2.5 text-sm text-white ${uploading ? 'opacity-60' : ''}`}>
          <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload document'}
          <input type="file" onChange={upload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-4 text-sm text-[#8A2E1D]">
          {error}
          <button onClick={() => { setLoading(true); load(); }} className="inline-flex items-center gap-1 text-[#7D4037]"><RefreshCw size={14} /> Try again</button>
        </div>
      )}

      {loading && <p className="mt-3 text-sm text-[#756760]">Loading documents…</p>}

      {!loading && !documents.length && !error && (
        <p className="mt-3 rounded-xl border border-dashed border-[#E5D6C8] p-4 text-sm text-[#756760]">No documents uploaded yet.</p>
      )}

      <div className="mt-3 grid gap-2">
        {documents.map(document => (
          <div key={document.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EFE3D6] bg-white p-3">
            <FileText size={18} className="text-[#A45846]" />
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-[#3D342F]">{document.filename}</p>
              <p className="text-sm text-[#756760]">
                {display(document.documentCategory)} · {readableSize(document.fileSize)} · Uploaded {formatDate(document.uploadedAt || document.created_date)} by {display(document.uploadedBy)}
              </p>
              {document.requirementId && (
                <p className="text-sm text-[#756760]">Evidence for: {display(requirementTitle(document.requirementId))}</p>
              )}
            </div>
            <a href={document.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-[#A45846]"><Download size={16} /> View</a>
            <button onClick={() => setConfirming(document)} aria-label="Delete document" className="text-[#756760]"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-[#E4B5AA] bg-[#FCF3F1] p-4 text-sm">
          <p className="text-[#8A2E1D]">Delete “{confirming.filename}”? This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={async () => { await grantsApi.deleteDocument(confirming.id); setConfirming(null); load(); }}
              className="rounded-lg bg-[#8A2E1D] px-4 py-2 text-white"
            >Delete</button>
            <button onClick={() => setConfirming(null)} className="rounded-lg px-4 py-2 text-[#756760]">Keep it</button>
          </div>
        </div>
      )}
    </div>
  );
}