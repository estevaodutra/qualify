import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Register listener FIRST to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    // THEN validate session
    const initializeAuth = async () => {
      try {
        const { data: { session: localSession } } = await supabase.auth.getSession();

        if (localSession) {
          // Validate the session is still valid on the server
          const { data: { user: validatedUser }, error: validationError } = await supabase.auth.getUser();

          if (isMounted) {
            if (validationError || !validatedUser) {
              console.warn("Session validation failed, clearing local session:", validationError?.message);
              await supabase.auth.signOut({ scope: "local" });
              setSession(null);
              setUser(null);
            } else {
              setSession(localSession);
              setUser(validatedUser);
            }
          }
        } else {
          if (isMounted) {
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      const { error: globalError } = await supabase.auth.signOut();

      if (globalError) {
        console.warn("Global sign out failed, attempting local fallback:", globalError.message);
        const { error: localError } = await supabase.auth.signOut({ scope: "local" });
        if (localError) {
          console.error("Local sign out also failed:", localError.message);
          return { error: localError };
        }
        return { error: null };
      }

      return { error: null };
    } catch (err) {
      console.error("Unexpected error during sign out:", err);
      try {
        await supabase.auth.signOut({ scope: "local" });
        return { error: null };
      } catch (fallbackErr) {
        return { error: fallbackErr as Error };
      }
    } finally {
      // Always clear local state regardless of backend result
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
