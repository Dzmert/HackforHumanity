import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AUTOSAVE_MS = 15000;

/**
 * Holds the record id for the note being written in this sitting, so repeated
 * saves update one record instead of creating duplicates.
 */
export function useCaseNoteDraft() {
  const noteIdRef = useRef(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  const persist = async (payload) => {
    setSaving(true);
    try {
      if (noteIdRef.current) {
        await base44.entities.CaseNote.update(noteIdRef.current, payload);
      } else {
        const created = await base44.entities.CaseNote.create(payload);
        noteIdRef.current = created.id;
      }
      setSavedAt(new Date());
      return noteIdRef.current;
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { noteIdRef.current = null; setSavedAt(null); };

  return { persist, reset, savedAt, saving, noteId: noteIdRef };
}

/** Crash protection only: re-saves the current text on an interval while it keeps changing. */
export function useAutosave(enabled, buildPayload, persist) {
  const buildRef = useRef(buildPayload);
  buildRef.current = buildPayload;

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const payload = buildRef.current();
      if (payload) persist(payload).catch(() => {});
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [enabled, persist]);
}