import { useCallback, useEffect, useState } from 'react';

import { fetchWeaponById, type WeaponWithPrograms } from '@/src/database/weapons-repository';

export const useWeapon = (weaponId?: string | null) => {
  const [weapon, setWeapon] = useState<WeaponWithPrograms | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(weaponId));
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!weaponId) {
      setWeapon(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchWeaponById(weaponId);
      setWeapon(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [weaponId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { weapon, loading, error, refresh: load };
};
