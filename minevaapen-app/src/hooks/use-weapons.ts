import { useCallback, useEffect, useState } from 'react';

import {
  fetchWeapons,
  type WeaponFilters,
  type WeaponWithPrograms,
} from '@/src/database/weapons-repository';
import { DATABASE_EVENTS, databaseEvents } from '@/src/services/events';

export const useWeapons = (filters: WeaponFilters = {}) => {
  const [weapons, setWeapons] = useState<WeaponWithPrograms[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    organizationId = null,
    programId = null,
    reserveFilter = 'any',
    ownershipFilter = 'all',
    allowedOrganizationIds = null,
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
        allowedOrganizationIds,
      });
      setWeapons(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [organizationId, programId, reserveFilter, ownershipFilter, allowedOrganizationIds]);

  useEffect(() => {
    void load();

    const subscription = databaseEvents.addListener(DATABASE_EVENTS.RESTORED, () => {
      void load();
    });

    return () => {
      subscription.remove();
    };
  }, [load]);

  return { weapons, loading, error, refresh: load };
};
