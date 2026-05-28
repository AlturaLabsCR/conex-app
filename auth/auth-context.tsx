import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearStoredSession,
  confirmEmailChange,
  deleteAccount,
  getAccount,
  getOptionalStoredSession,
  loginOrCreateAccount,
  logout as logoutFromApi,
  requestEmailChange,
  verifyAuthenticationCode,
  type AccountResponse,
} from '@/api/conex-api';

type AuthContextValue = {
  account: AccountResponse | null;
  email: string;
  error: string;
  isLoading: boolean;
  clearError: () => void;
  confirmEmailChange: (otp: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  requestEmailChange: (newEmail: string) => Promise<void>;
  verifyLogin: (email: string, otp: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAccount = useCallback(async () => {
    const nextAccount = await getAccount();

    setAccount(nextAccount);
    setEmail(nextAccount.email);
  }, []);

  const resetSession = useCallback(async () => {
    await clearStoredSession();
    setAccount(null);
    setEmail('');
  }, []);

  const handleApiError = useCallback((apiError: unknown): never => {
    setError(errorMessage(apiError));
    throw apiError;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const session = await getOptionalStoredSession();

        if (!session) {
          return;
        }

        const nextAccount = await getAccount();

        if (isMounted) {
          setAccount(nextAccount);
          setEmail(nextAccount.email);
        }
      } catch (loadError) {
        if (isMounted) {
          await clearStoredSession();
          setAccount(null);
          setEmail('');
          setError(errorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      email,
      error,
      isLoading,
      clearError: () => setError(''),
      confirmEmailChange: async (otp) => {
        setError('');
        try {
          await confirmEmailChange(otp);
          await loadAccount();
        } catch (apiError) {
          handleApiError(apiError);
        }
      },
      deleteAccount: async () => {
        setError('');
        try {
          await deleteAccount();
          setAccount(null);
          setEmail('');
        } catch (apiError) {
          handleApiError(apiError);
        }
      },
      login: async (nextEmail) => {
        setError('');
        try {
          await loginOrCreateAccount(nextEmail);
        } catch (apiError) {
          handleApiError(apiError);
        }
      },
      logout: async () => {
        setError('');
        try {
          await logoutFromApi();
        } catch {
          // Still clear local credentials if token revocation fails.
        } finally {
          await resetSession();
        }
      },
      requestEmailChange: async (newEmail) => {
        setError('');
        try {
          await requestEmailChange(newEmail);
        } catch (apiError) {
          handleApiError(apiError);
        }
      },
      verifyLogin: async (nextEmail, otp) => {
        setError('');
        try {
          await verifyAuthenticationCode(nextEmail, otp);
          await loadAccount();
        } catch (apiError) {
          handleApiError(apiError);
        }
      },
    }),
    [account, email, error, handleApiError, isLoading, loadAccount, resetSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
}
