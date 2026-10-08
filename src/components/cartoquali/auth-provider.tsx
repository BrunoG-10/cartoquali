import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthContext, type GuideProgress } from "@/lib/auth.functions";
import type { RegistryUser, UserRole } from "@/types/cartoquali";

type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "missing_profile"
  | "missing_registry"
  | "missing_role"
  | "inactive_user"
  | "inactive_registry"
  | "error";
type AuthValue = {
  user: User | null;
  usuario: RegistryUser | null;
  cartorio: { id: string; name: string; officialName: string } | null;
  currentRole: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  status: AuthStatus;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  refresh(): Promise<void>;
  /** Progresso do guia de uso; null = desconhecido (não abre o tour sozinho). */
  guide: GuideProgress | null;
  setGuide(next: GuideProgress): void;
};
const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<RegistryUser | null>(null);
  const [cartorio, setCartorio] = useState<AuthValue["cartorio"]>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [guide, setGuide] = useState<GuideProgress | null>(null);
  const fetchContext = useServerFn(getCurrentAuthContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const clear = useCallback(() => {
    setUser(null);
    setUsuario(null);
    setCartorio(null);
    setCurrentRole(null);
  }, []);
  // Background re-checks (tab focus, timer, auth events) keep the current screen while they run;
  // only the first check shows the "Verificando acesso" state.
  const refresh = useCallback(async () => {
    setStatus((current) => (current === "authenticated" ? current : "loading"));
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      clear();
      setStatus("unauthenticated");
      return;
    }
    setUser(data.user);
    try {
      const result = await fetchContext();
      if (result.status === "active") {
        setUsuario(result.usuario);
        setCartorio(result.cartorio);
        setCurrentRole(result.role);
        setGuide(result.guide);
        setStatus("authenticated");
      } else {
        setUsuario(null);
        setCartorio(null);
        setCurrentRole(null);
        setStatus(result.status);
      }
    } catch {
      // A transient network failure during a background re-check must not log the user out.
      setStatus((current) => (current === "authenticated" ? current : "error"));
    }
  }, [clear, fetchContext]);
  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") {
        clear();
        setStatus("unauthenticated");
        void router.invalidate();
        return;
      }
      void refresh();
      void router.invalidate();
      void queryClient.invalidateQueries();
    });
    const verify = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", verify);
    const timer = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", verify);
      window.clearInterval(timer);
    };
  }, [clear, queryClient, refresh, router]);
  const signIn = async (email: string, password: string) => {
    setStatus("loading");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("unauthenticated");
      throw new Error("Email ou senha inválidos.");
    }
    await refresh();
  };
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    clear();
    setStatus("unauthenticated");
    await navigate({ to: "/login", replace: true });
  };
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error("Não foi possível enviar o email de recuperação.");
  };
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error("Não foi possível definir a nova senha.");
  };
  const value = useMemo<AuthValue>(
    () => ({
      user,
      usuario,
      cartorio,
      currentRole,
      loading: status === "loading",
      isAuthenticated: status === "authenticated",
      status,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      refresh,
      guide,
      setGuide,
    }),
    [user, usuario, cartorio, currentRole, status, guide],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}
