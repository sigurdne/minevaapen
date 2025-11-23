import { useCallback, useEffect, useState } from 'react';

import { fetchProgramUsage, type ProgramUsage } from '@/src/database/weapons-repository';

type UseProgramsOptions = {
  organizationId?: string | null;
  allowedOrganizationIds?: string[] | null;
};

export const usePrograms = (options: UseProgramsOptions = {}) => {
  const [programs, setPrograms] = useState<ProgramUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { organizationId = null, allowedOrganizationIds = null } = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchProgramUsage(organizationId ?? null, allowedOrganizationIds);
      setPrograms(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [organizationId, allowedOrganizationIds]);

  useEffect(() => {
    void load();
  }, [load]);

  return { programs, loading, error, refresh: load };
};
