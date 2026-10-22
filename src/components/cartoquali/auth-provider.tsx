import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthContext, type GuideProgress } from "@/lib/auth.functions";
import { getPasswordSetupUrl } from "@/lib/public-url";
import { clearGuidePostponed } from "@/lib/guide/postponed";
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
  | "trial_expired"
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
  resetPassword(email: string, kind?: "invite" | "recovery"): Promise<void>;
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
  const inFlight = useRef<Promise<void> | null>(null);
  const userId = useRef<string | null>(null);
  // Background re-checks (tab focus, timer, auth events) keep the current screen while they run;
  // only the first check shows the "Verificando acesso" state.
  const check = useCallback(async () => {
    setStatus((current) => (current === "authenticated" ? current : "loading"));
    // The stored session needs no network round trip; the server function validates the token.
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    if (!sessionUser) {
      userId.current = null;
      clear();
      setStatus("unauthenticated");
      return;
    }
    userId.current = sessionUser.id;
    setUser(sessionUser);
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
      // A transient network failure during a background re-check must not log the user out,
      // but a stored session the server rejects (revoked user) is a real sign-out.
      const { data: confirmed } = await supabase.auth.getUser();
      if (!confirmed.user) {
        userId.current = null;
        clear();
        setStatus("unauthenticated");
        return;
      }
      setStatus((current) => (current === "authenticated" ? current : "error"));
    }
  }, [clear, fetchContext]);
  // Concurrent triggers (page load plus the SIGNED_IN replayed from storage) share one check.
  const refresh = useCallback(() => {
    inFlight.current ??= check().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [check]);
  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") {
        // Also on session expiry or sign-out in another tab, not only via signOut().
        userId.current = null;
        clearGuidePostponed();
        clear();
        setStatus("unauthenticated");
        void router.invalidate();
        return;
      }
      // Supabase replays SIGNED_IN for the stored session on every page load: same user, nothing to redo.
      if (event === "SIGNED_IN" && session?.user.id === userId.current) return;
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
    clearGuidePostponed();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("unauthenticated");
      throw new Error("E-mail ou senha inválidos.");
    }
    await refresh();
  };
  const signOut = async () => {
    clearGuidePostponed();
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    clear();
    setStatus("unauthenticated");
    await navigate({ to: "/login", replace: true });
  };
  const resetPassword = async (email: string, kind: "invite" | "recovery" = "recovery") => {
    // Para quem ainda não criou a senha (convite), o link de recuperação também confirma o
    // e-mail; "invite" só mantém o texto de primeiro acesso na tela de senha.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordSetupUrl(kind),
    });
    if (error)
      throw new Error(
        error.status === 429 || /rate|seconds/i.test(error.message)
          ? "Aguarde um minuto antes de pedir outro link."
          : "Não foi possível enviar o e-mail de recuperação.",
      );
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
    [user, usuario, cartorio, currentRole, status, guide, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}
