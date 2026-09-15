import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/** Small data hook: GET on mount (and on `deps` change) with pull-to-refresh support. */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!path) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        setData(await api.get<T>(path));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, ...deps],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, refreshing, reload: () => load(false), refresh: () => load(true), setData };
}
