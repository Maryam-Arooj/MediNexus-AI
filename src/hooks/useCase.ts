import { useCallback, useEffect, useState } from 'react';
import { fetchCase } from '../api/client';
import type { PatientRecord } from '../types/medical';

/** Always loads the case fresh from the server (so status/approval are never stale). */
export function useCase(caseId: string) {
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchCase(caseId)
      .then(setRecord)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { record, error, loading, reload: load };
}
