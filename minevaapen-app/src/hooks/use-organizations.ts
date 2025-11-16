import { useEffect, useState } from 'react';

import { runSql } from '@/src/database/sqlite-helpers';

export type Organization = {
  id: string;
  name: string;
  shortName: string | null;
  country: string | null;
};

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await runSql<Organization>(
          'SELECT id, name, shortName, country FROM organizations ORDER BY name'
        );

        if (isMounted) {
          setOrganizations(result.rows);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { organizations, loading, error };
};
