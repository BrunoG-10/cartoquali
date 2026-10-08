import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { LogoMark, Wordmark } from "@/components/cartoquali/logo";
import { supabase } from "@/integrations/supabase/client";
import { recoveryLinkError } from "@/lib/recovery-link";
import { AuthShowcase, AuthShowcaseCompact } from "./auth-scene";

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[1fr_1.1fr]">
      <AuthShowcaseCompact />
      <div className="grid flex-1 place-items-center px-4 py-10 sm:px-8">
        <main className="animate-enter w-full max-w-md">
          <div className="mb-7 flex items-center justify-center gap-3">
            <LogoMark size={44} />
            <div>
              <Wordmark className="block text-2xl leading-tight" />
              <small className="text-muted-foreground">Gestão de qualidade</small>
            </div>
          </div>
          <section className="rounded-lg border border-glass-border bg-glass p-6 shadow-glass backdrop-blur-xl sm:p-8">
            {children}
          </section>
        </main>
      </div>
      <AuthShowcase />
    </div>
  );
}
export function LoginPage({ redirect }: { redirect: string }) {
  const { signIn, resetPassword, status, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (isAuthenticated)
      void navigate({
        to: redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard",
        replace: true,
      });
  }, [isAuthenticated, navigate, redirect]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovering) {
        await resetPassword(email);
        setMessage("Email de recuperação enviado.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível realizar o login. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthFrame>
      <div className="text-center">
        <ShieldCheck className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">
          {recovering ? "Recuperar acesso" : "Acesso administrativo"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {recovering
            ? "Informe seu email para receber as instruções."
            : "Entre com seu email e senha."}
        </p>
      </div>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Email
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>
        {!recovering && (
          <label className="block text-sm font-medium">
            Senha
            <div className="relative mt-1.5">
              <LockKeyhole className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-md bg-success-soft p-3 text-sm text-success">
            {message}
          </p>
        )}
        <Button className="w-full" disabled={busy || status === "loading"}>
          {busy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
          {recovering ? "Enviar recuperação" : "Entrar"}
        </Button>
      </form>
      <Button
        variant="link"
        className="mt-3 w-full"
        onClick={() => {
          setRecovering(!recovering);
          setError("");
          setMessage("");
        }}
      >
        {recovering ? "Voltar ao login" : "Esqueci minha senha"}
      </Button>
    </AuthFrame>
  );
}
export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The e-mail link signs the user in and Supabase then strips the tokens from the URL, so the
  // form is enabled by the resulting session, not by the URL.
  const [link, setLink] = useState<"checking" | "ready" | "expired" | "invalid" | "missing">(
    "checking",
  );
  useEffect(() => {
    const linkError = recoveryLinkError(window.location.hash, window.location.search);
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ["PASSWORD_RECOVERY", "SIGNED_IN", "INITIAL_SESSION"].includes(event))
        setLink("ready");
    });
    void supabase.auth.getSession().then(({ data: current }) => {
      if (!active) return;
      setLink((state) =>
        state === "ready" || current.session ? "ready" : (linkError ?? "missing"),
      );
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const recovery = link === "ready";
  // Invitation links carry ?origem=convite (see getPasswordSetupUrl); a new user creates a
  // password rather than replacing one.
  const [invite] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("origem") === "convite",
  );
  const retry = invite
    ? "Peça ao administrador do cartório um novo convite, ou use “Esqueci minha senha” com o seu e-mail."
    : "Peça um novo em “Esqueci minha senha”.";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível definir a senha.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthFrame>
      <h1 className="font-display text-2xl font-bold">
        {invite ? "Crie sua senha de acesso" : "Definir nova senha"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {invite
          ? "Você recebeu um convite para o CartoQuali. Escolha uma senha para entrar no sistema."
          : "Escolha uma nova senha para seu acesso administrativo."}
      </p>
      {link === "checking" && (
        <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Validando o link recebido...
        </p>
      )}
      {(link === "expired" || link === "invalid" || link === "missing") && (
        <p role="alert" className="mt-5 rounded-md bg-warning-soft p-3 text-sm text-warning">
          {link === "expired"
            ? `Este link expirou ou já foi usado. ${retry}`
            : link === "invalid"
              ? `Não foi possível validar este link. ${retry}`
              : "Abra esta página pelo link mais recente recebido no email."}
        </p>
      )}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          Nova senha
          <Input
            className="mt-1.5"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Confirmar senha
          <Input
            className="mt-1.5"
            type="password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={busy || !recovery}>
          {busy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}Salvar nova senha
        </Button>
      </form>
      <Button asChild variant="link" className="mt-3 w-full">
        <Link to="/login">Voltar ao login</Link>
      </Button>
    </AuthFrame>
  );
}
export function AuthAccessState() {
  const { status, signOut } = useAuth();
  const copy: Record<string, [string, string]> = {
    loading: ["Verificando acesso", "Aguarde enquanto validamos sua sessão."],
    missing_profile: [
      "Acesso sem perfil",
      "Sua conta ainda não está vinculada a um usuário do CartoQuali.",
    ],
    missing_registry: ["Cartório não encontrado", "Seu perfil não possui um cartório válido."],
    missing_role: ["Perfil sem permissão", "Solicite ao administrador a definição do seu perfil."],
    inactive_user: ["Usuário inativo", "Seu acesso administrativo está inativo."],
    inactive_registry: ["Cartório inativo", "O acesso deste cartório está inativo."],
    error: ["Não foi possível validar o acesso", "Tente novamente em instantes."],
  };
  const item = copy[status] ??
    copy["error"] ?? ["Acesso indisponível", "Tente novamente em instantes."];
  if (status === "loading")
    return (
      <AuthFrame>
        <div role="status" className="flex items-center gap-3">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          <div>
            <h1 className="font-display text-xl font-bold">{item[0]}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{item[1]}</p>
          </div>
        </div>
      </AuthFrame>
    );
  return (
    <AuthFrame>
      <h1 className="font-display text-2xl font-bold">{item[0]}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{item[1]}</p>
      <Button className="mt-6 w-full" variant="outline" onClick={() => void signOut()}>
        Sair
      </Button>
    </AuthFrame>
  );
}
