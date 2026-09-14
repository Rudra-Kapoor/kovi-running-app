import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler, type AuthResponse, type User } from './api';

interface AuthState {
  /** undefined while the stored session is being restored */
  user: User | null | undefined;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetches the profile (after onboarding / edits). */
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return setUserState(null);
      try {
        const me = await api.get<User>('/auth/me');
        if (!cancelled) setUserState(me);
      } catch (e: any) {
        // Offline: keep the session; token errors: sign out.
        if (!cancelled) setUserState(e?.status === 401 ? null : null);
        if (e?.status === 401) await setToken(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUserState(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const accept = useCallback(async (res: AuthResponse) => {
    await setToken(res.accessToken);
    setUserState(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      signInWithEmail: async (email, password) =>
        accept(await api.post<AuthResponse>('/auth/login', { email, password }, false)),
      signUpWithEmail: async (email, password, name) =>
        accept(await api.post<AuthResponse>('/auth/register', { email, password, name }, false)),
      signInWithGoogle: async (idToken) => accept(await api.post<AuthResponse>('/auth/google', { idToken }, false)),
      signInWithApple: async (identityToken, fullName) =>
        accept(await api.post<AuthResponse>('/auth/apple', { identityToken, fullName }, false)),
      resetPassword: async (email, code, newPassword) =>
        accept(await api.post<AuthResponse>('/auth/reset-password', { email, code, newPassword }, false)),
      signOut: async () => {
        await setToken(null);
        setUserState(null);
      },
      refreshUser: async () => setUserState(await api.get<User>('/auth/me')),
      setUser: (u) => setUserState(u),
    }),
    [user, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
