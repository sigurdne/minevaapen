import { useCallback, useEffect, useState } from 'react';

import {
  fetchWeapons,
  type WeaponFilters,
  type WeaponWithPrograms,
} from '@/src/database/weapons-repository';

export const useWeapons = (filters: WeaponFilters = {}) => {
  const [weapons, setWeapons] = useState<WeaponWithPrograms[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    organizationId = null,
    programId = null,
    reserveFilter = 'any',
    ownershipFilter = 'all',
  } = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchWeapons({
        organizationId,
        programId,
        reserveFilter,
        ownershipFilter,
      });
      setWeapons(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [organizationId, programId, reserveFilter, ownershipFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { weapons, loading, error, refresh: load };
};
