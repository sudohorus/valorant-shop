import { useCallback, useEffect, useState } from 'react';

/**
 * Carrega dados remotos com estados de carregando/erro/refresh.
 *
 * `load` precisa ser estável (useCallback) — é o que dispara
 * a recarga quando muda.
 */
export function useRemote(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(
    async (isRefresh) => {
      if (isRefresh) {
        setRefreshing(true);
      }

      try {
        setError(null);

        setData(await load());
      } catch (problem) {
        setError(problem);
      } finally {
        setRefreshing(false);
      }
    },
    [load]
  );

  useEffect(() => {
    run(false);
  }, [run]);

  return {
    data,
    error,
    refreshing,
    loading: data === null && error === null,
    refresh: () => run(true),
  };
}
