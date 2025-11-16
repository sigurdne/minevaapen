import { useCallback, useEffect, useState } from 'react';

import { fetchProgramUsage, type ProgramUsage } from '@/src/database/weapons-repository';

export const usePrograms = (organizationId?: string | null) => {
  const [programs, setPrograms] = useState<ProgramUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchProgramUsage(organizationId ?? null);
      setPrograms(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { programs, loading, error, refresh: load };
};
