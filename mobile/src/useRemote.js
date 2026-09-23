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
    // Fonte nova (outro filtro, outro idioma): não mostra os dados
    // da anterior enquanto a nova carrega.
    setData(null);
    setError(null);

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
