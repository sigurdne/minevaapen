import { useCallback, useEffect, useState } from 'react';

import {
  fetchOrganizations,
  setAllOrganizationMemberships,
  setOrganizationMembership,
  type OrganizationRecord,
} from '@/src/database/organizations-repository';

export type Organization = OrganizationRecord;

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOrganizations();
      setOrganizations(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = load;

  const updateMembership = useCallback(
    async (organizationId: string, isMember: boolean) => {
      setOrganizations((prev) =>
        prev.map((org) => (org.id === organizationId ? { ...org, isMember } : org))
      );

      try {
        await setOrganizationMembership(organizationId, isMember);
      } catch (err) {
        console.warn('Failed to update organization membership', err);
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  const updateAllMemberships = useCallback(
    async (isMember: boolean) => {
      setUpdating(true);
      setOrganizations((prev) => prev.map((org) => ({ ...org, isMember })));

      try {
        await setAllOrganizationMemberships(isMember);
      } catch (err) {
        console.warn('Failed to update all organization memberships', err);
        await refresh();
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [refresh]
  );

  return { organizations, loading, error, refresh, updateMembership, updateAllMemberships, updating };
};
