import { userMessage } from "@/lib/user-message";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, LoaderCircle, LockKeyhole, Mail, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { LogoMark, Wordmark } from "@/components/cartoquali/logo";
import { supabase } from "@/integrations/supabase/client";
import { recoveryLinkError } from "@/lib/recovery-link";
import { validatePassword } from "@/utils/cartoquali-validation";
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
        setMessage("E-mail de recuperação enviado. Confira também a caixa de spam.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(userMessage(err, "Não foi possível realizar o login. Tente novamente."));
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
            ? "Informe seu e-mail para receber as instruções."
            : "Entre com seu e-mail e senha."}
        </p>
      </div>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          E-mail
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
  const { updatePassword, user } = useAuth();
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
  const retry = "Peça um novo link abaixo: ele chega no seu e-mail em instantes.";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const passwordError = validatePassword(password, user?.email);
    if (passwordError) {
      setError(passwordError);
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
      setError(userMessage(err, "Não foi possível definir a senha."));
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
              : `Abra esta página pelo link mais recente recebido no e-mail, ou ${retry.charAt(0).toLowerCase()}${retry.slice(1)}`}
        </p>
      )}
      {(link === "expired" || link === "invalid" || link === "missing") && (
        <NewLinkForm kind={invite ? "invite" : "recovery"} />
      )}
      <form
        className={recovery || link === "checking" ? "mt-6 space-y-4" : "hidden"}
        onSubmit={submit}
      >
        <label className="block text-sm font-medium">
          Nova senha
          <Input
            className="mt-1.5"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Pelo menos 8 caracteres, com letras e números.
          </span>
        </label>
        <label className="block text-sm font-medium">
          Confirmar senha
          <Input
            className="mt-1.5"
            type="password"
            autoComplete="new-password"
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
/**
 * Link vencido ou já usado: a própria pessoa pede outro, sem depender de um novo convite.
 * O link do Supabase vale no máximo 24 horas; a mensagem não revela se o e-mail tem cadastro.
 */
function NewLinkForm({ kind }: { kind: "invite" | "recovery" }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await resetPassword(email.trim(), kind);
      setSent(email.trim());
    } catch (err) {
      setError(userMessage(err, "Não foi possível enviar o novo link."));
    } finally {
      setBusy(false);
    }
  };
  if (sent)
    return (
      <p role="status" className="mt-5 rounded-md bg-success-soft p-3 text-sm text-success">
        Pronto! Se <strong>{sent}</strong> tiver acesso ao CartoQuali, um novo link chega em alguns
        minutos. Abra o e-mail mais recente (confira também o spam). O link vale por 24 horas.
      </p>
    );
  return (
    <form className="mt-5 space-y-3" onSubmit={submit}>
      <label className="block text-sm font-medium">
        Seu e-mail
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
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Mail />}
        Receber novo link
      </Button>
    </form>
  );
}

export function AuthAccessState() {
  const { status, signOut, refresh } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };
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
    trial_expired: [
      "Período de teste encerrado",
      "Os 7 dias de teste gratuito deste cartório terminaram. Entre em contato com o administrador para continuar usando o CartoQuali.",
    ],
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
      {/* A connection hiccup is not a reason to sign out: let the user try again first. */}
      {status === "error" && (
        <Button className="mt-6 w-full" disabled={retrying} onClick={() => void retry()}>
          {retrying ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
          Tentar novamente
        </Button>
      )}
      <Button
        className={status === "error" ? "mt-2 w-full" : "mt-6 w-full"}
        variant="outline"
        onClick={() => void signOut()}
      >
        Sair
      </Button>
    </AuthFrame>
  );
}
