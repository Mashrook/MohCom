import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { sessionManager } from "@/utils/secureStorage";

type AppRole = Database["public"]["Enums"]["app_role"];

interface SubscriptionInfo {
  subscribed: boolean;
  planType: string;
  subscriptionEnd: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  userRole: AppRole | null;
  isAdmin: boolean;
  isLawyer: boolean;
  isClient: boolean;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    planType: "free",
    subscriptionEnd: null,
  });

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.role) {
        setUserRole(data.role);
      } else {
        setUserRole("client");
      }
    } catch {
      setUserRole("client");
    }
  };

  const checkSubscription = async () => {
    try {
      const result = await supabase.auth.getSession();
      const freshSession = result?.data?.session;

      if (!freshSession?.user) {
        setSubscription({ subscribed: false, planType: "free", subscriptionEnd: null });
        return;
      }

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("status, plan_type, current_period_end, ends_at, source")
        .eq("user_id", freshSession.user.id)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const end = sub?.ends_at ? new Date(sub.ends_at) : null;
      const isActive = !!sub && sub.status === "active" && end !== null && end > now;

      setSubscription({
        subscribed: isActive,
        planType: isActive ? (sub?.plan_type || "free") : "free",
        subscriptionEnd: isActive ? (sub?.ends_at || null) : null,
      });
    } catch (error) {
      console.error("Subscription check failed (offline?)", error);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserRole(null);
      setSubscription({ subscribed: false, planType: "free", subscriptionEnd: null });

      await supabase.auth.signOut({ scope: "global" });
      await sessionManager.clearExpiredSession();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        // Get initial session from Supabase
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          fetchUserRole(initialSession.user.id);
          checkSubscription();
          await sessionManager.startSession();
        }

        // Listen for auth state changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return;
            
            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
              await sessionManager.startSession();
              fetchUserRole(newSession.user.id);
              checkSubscription();
            } else {
              setUserRole(null);
            }

            setLoading(false);
          }
        );

        if (mounted) {
          setLoading(false);
        }

        return () => {
          authSubscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing session:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const isAdmin = userRole === "admin";
  const isLawyer = userRole === "lawyer";
  const isClient = userRole === "client";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        userRole,
        isAdmin,
        isLawyer,
        isClient,
        signOut,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
