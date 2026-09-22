import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { openSession } from './riot';

const AuthContext = createContext(null);

/**
 * Guarda a sessão da Riot para o app inteiro.
 *
 * 'probing' = tentando reaproveitar o cookie do WebView sem
 * mostrar nada; 'anonymous' = precisa da tela de login.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('probing');
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (tokens) => {
    setStatus('opening');

    try {
      setSession(await openSession(tokens));

      setStatus('ready');
    } catch (problem) {
      setError(problem.message);

      setStatus('failed');
    }
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({
      status,
      session,
      error,
      signIn,
      signOut,
      needsLogin: () => setStatus('anonymous'),
      retry: () => setStatus('anonymous'),
    }),
    [status, session, error, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }

  return value;
}

/** Sessão já aberta — para as telas de dentro do app. */
export function useSession() {
  return useAuth().session;
}
