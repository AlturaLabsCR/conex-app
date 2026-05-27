import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

type AuthSession = {
  email: string;
};

type AuthContextValue = {
  email: string;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SESSION_STORAGE_KEY = 'conex.session';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        const session = storedSession ? (JSON.parse(storedSession) as Partial<AuthSession>) : null;

        if (isMounted && typeof session?.email === 'string') {
          setEmail(session.email);
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
      email,
      isLoading,
      login: async (nextEmail) => {
        const session: AuthSession = { email: nextEmail };

        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        setEmail(nextEmail);
      },
      logout: async () => {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        setEmail('');
      },
    }),
    [email, isLoading]
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
