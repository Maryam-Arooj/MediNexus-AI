import { useEffect, useState } from 'react';
import { fetchTriageOptions } from '../api/client';
import type { TriageOptions } from '../types/medical';

let cache: TriageOptions | null = null;

export function useTriageOptions() {
  const [options, setOptions] = useState<TriageOptions | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchTriageOptions()
      .then((o) => {
        cache = o;
        if (alive) setOptions(o);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return { options, error, retry: () => { setError(null); setAttempt((a) => a + 1); } };
}
