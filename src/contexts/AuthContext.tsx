import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Provisionar nativamente na API4COM assim que o usuário cria a conta
    if (!error && signUpData?.user?.id) {
      supabase.functions
        .invoke("api4com-manage-user", {
          body: {
            action: "generate-token",
            user_id: signUpData.user.id,
            email,
            name: fullName,
            password,
          },
        })
        .then(({ data, error: funcErr }) => {
          if (funcErr || !data?.success) {
            console.warn("[AuthContext] Provisionamento API4COM no cadastro:", funcErr || data?.error);
          } else {
            console.log("[AuthContext] Usuário e Ramal API4COM provisionados com sucesso:", data.extension);
          }
        })
        .catch((err) => {
          console.warn("[AuthContext] Falha ao comunicar com api4com-manage-user:", err);
        });
    }

    return { error: error as Error | null };
  };

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      // Unsubscribe push notification for this user/device on logout
      if (typeof window !== "undefined" && "serviceWorker" in navigator && user?.id) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe().catch(console.error);
            await supabase
              .from("push_subscriptions")
              .update({ revoked_at: new Date().toISOString() })
              .eq("user_id", user.id)
              .eq("endpoint", endpoint)
              .catch(console.error);
          }
        } catch (pushErr) {
          console.warn("Could not revoke push subscription on sign out:", pushErr);
        }
      }

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
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signInWithGoogle, signUp, signOut }}>
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
