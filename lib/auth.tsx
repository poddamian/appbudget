import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { isOnboardingCompleted, markOnboardingCompleted } from "./onboarding";
import { supabase } from "./supabase";

type AuthContextValue = {
  session: Session | null;
  /** true, dopóki nie odtworzymy zapisanej sesji z pamięci urządzenia */
  isLoading: boolean;
  /** czy zalogowany użytkownik ukończył onboarding (false w trakcie ładowania flagi) */
  onboardingCompleted: boolean;
  /** true, dopóki nie odczytamy flagi onboardingu dla bieżącego użytkownika */
  isOnboardingLoading: boolean;
  /** oznacza onboarding jako ukończony i odblokowuje główny widok */
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  onboardingCompleted: false,
  isOnboardingLoading: true,
  completeOnboarding: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Flaga trzymana razem z id użytkownika, którego dotyczy — dzięki temu
  // po zmianie sesji nie ma ani jednej klatki z flagą poprzedniego stanu.
  const [onboardingState, setOnboardingState] = useState<{
    userId: string;
    completed: boolean;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Po każdej zmianie użytkownika odczytaj jego flagę onboardingu.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setOnboardingState(null);
      return;
    }

    let cancelled = false;
    isOnboardingCompleted(userId).then((completed) => {
      if (!cancelled) {
        setOnboardingState({ userId, completed });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hasFreshFlag = !!userId && onboardingState?.userId === userId;
  const onboardingCompleted = hasFreshFlag && onboardingState.completed;
  const isOnboardingLoading = !!userId && !hasFreshFlag;

  const completeOnboarding = useCallback(async () => {
    if (userId) {
      await markOnboardingCompleted(userId);
      setOnboardingState({ userId, completed: true });
    }
  }, [userId]);

  // Odświeżanie tokenu tylko, gdy aplikacja jest na pierwszym planie
  // (zalecenie Supabase dla React Native).
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        onboardingCompleted,
        isOnboardingLoading,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
