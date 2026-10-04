import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getPublicEvaluation, submitPublicEvaluation } from "@/lib/public-evaluation.functions";
import { validateContact } from "@/utils/cartoquali-validation";
import { SurveyQuestionnaire, type SurveyAnswers } from "./survey-questionnaire";
import type { SurveyQuestion } from "@/types/cartoquali";

export function PublicEvaluation({ code, testToken }: { code?: string; testToken?: string }) {
  const fetchEvaluation = useServerFn(getPublicEvaluation);
  const submitEvaluation = useServerFn(submitPublicEvaluation);
  const query = useQuery({
    queryKey: ["public-evaluation", code],
    queryFn: () => fetchEvaluation({ data: { code: code ?? "" } }),
    enabled: Boolean(code),
    retry: 1,
  });
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<SurveyAnswers>();
  const [contactRequested, setContactRequested] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [validationError, setValidationError] = useState<string>();

  if (!code)
    return (
      <Unavailable
        title="Use o link do ponto de avaliação."
        description="Leia o QR Code ou solicite à equipe do cartório o link correto."
      />
    );
  if (query.isLoading)
    return (
      <Screen registryName="CartoQuali" pointName="Carregando">
        <div role="status" className="py-8">
          <LoaderCircle className="mx-auto size-9 animate-spin text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Carregando pesquisa</h1>
          <p className="mt-2 text-sm text-muted-foreground">Só um instante.</p>
        </div>
      </Screen>
    );
  if (query.isError)
    return (
      <Unavailable
        title="Não foi possível carregar a pesquisa."
        description="Verifique sua conexão e tente novamente."
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  const context = query.data;
  if (!context || context.status === "not_found")
    return (
      <Unavailable
        title="Ponto de avaliação não encontrado."
        description="Confira o acesso no cartaz ou peça ajuda à equipe do cartório."
      />
    );
  if (context.status === "inactive")
    return (
      <Unavailable
        title="Este ponto está inativo."
        description="Peça à equipe do cartório outro ponto de avaliação."
      />
    );
  if (context.status === "unavailable")
    return (
      <Unavailable
        title="Pesquisa indisponível."
        description="Este ponto não possui uma pesquisa ativa no momento."
      />
    );
  if (context.status !== "ready")
    return (
      <Unavailable title="Pesquisa indisponível." description="Tente novamente em instantes." />
    );

  const surveyQuestions: SurveyQuestion[] = context.questions.map((question) => ({
    id: question.key,
    registryId: "public",
    surveyId: "public",
    text: question.text,
    type: question.type,
    dimensionId: question.dimension,
    order: question.order,
    required: question.required,
    active: true,
    options: question.options.map((option) => option.label),
    ...(question.condition ? { condition: question.condition } : {}),
  }));
  const allowContact = context.settings.allowContactRequest;
  const thankYouMessage =
    context.settings.thankYouMessage ?? "Obrigado por ajudar este cartório a melhorar.";

  const reset = () => {
    setStarted(false);
    setAnswers(undefined);
    setContactRequested(false);
    setName("");
    setPhone("");
    setEmail("");
    setConsent(false);
    setDone(false);
    setError(undefined);
    setValidationError(undefined);
  };
  const getIdempotencyKey = () => {
    const storageKey = `cartoquali-submission-${code}`;
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  };
  const getSubmissionSession = () => {
    const storageKey = "cartoquali-public-submission-session";
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, generated);
    return generated;
  };
  const send = async () => {
    if (!answers || sending) return;
    const contactError = contactRequested
      ? validateContact(name, phone, email, consent)
      : undefined;
    if (contactError) {
      setValidationError(contactError);
      return;
    }
    setSending(true);
    setError(undefined);
    setValidationError(undefined);
    try {
      await submitEvaluation({
        data: {
          code,
          idempotencyKey: getIdempotencyKey(),
          submissionSession: getSubmissionSession(),
          answers,
          contact: contactRequested
            ? {
                requested: true,
                name: name.trim(),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
                ...(email.trim() ? { email: email.trim() } : {}),
              }
            : { requested: false },
          ...(testToken ? { testToken } : {}),
        },
      });
      window.sessionStorage.removeItem(`cartoquali-submission-${code}`);
      setDone(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível confirmar o envio. Verifique sua conexão e tente novamente com segurança.",
      );
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <Screen registryName={context.registryName} pointName={context.pointName}>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Obrigado pela sua avaliação.</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">{thankYouMessage}</p>
        <p className="mt-6 text-sm font-medium">
          Avaliação realizada em: <strong>{context.pointName}</strong>
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          A resposta foi registrada sem vínculo com uma conta de usuário. Caso tenha solicitado
          contato, esses dados ficam separados e restritos.
        </p>
        <Button className="mt-8 w-full" onClick={reset} variant="outline">
          <RotateCcw />
          Avaliar novamente
        </Button>
      </Screen>
    );
  if (!started)
    return (
      <Screen registryName={context.registryName} pointName={context.pointName}>
        <h1 className="font-display text-3xl font-bold">Como foi sua experiência hoje?</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
          {context.surveyDescription ?? "Sua resposta é rápida e ajuda a melhorar o atendimento."}
        </p>
        <div className="mt-5 rounded-lg bg-muted/60 p-3 text-left text-xs leading-5 text-muted-foreground">
          <strong className="text-foreground">Privacidade por padrão.</strong> A avaliação não exige
          conta nem identificação no cadastro do CartoQuali. Não informe dados pessoais seus ou de
          terceiros nos campos de comentário.
        </div>
        <Button className="mt-6 min-h-12 w-full" size="lg" onClick={() => setStarted(true)}>
          Iniciar avaliação
          <ArrowRight />
        </Button>
      </Screen>
    );
  if (!answers)
    return (
      <Screen registryName={context.registryName} pointName={context.pointName}>
        <SurveyQuestionnaire questions={surveyQuestions} onComplete={setAnswers} />
      </Screen>
    );
  return (
    <Screen registryName={context.registryName} pointName={context.pointName}>
      <h1 className="font-display text-2xl font-bold">Finalizar avaliação</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        O contato é opcional. Sem ele, a avaliação é registrada sem identificação no cadastro do
        CartoQuali.
      </p>
      {allowContact && (
        <>
          <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 text-left text-sm">
            <Checkbox
              aria-label="Solicitar contato do cartório"
              checked={contactRequested}
              onCheckedChange={(checked) => {
                setContactRequested(checked === true);
                setValidationError(undefined);
              }}
            />
            Deseja que o cartório entre em contato?{" "}
            <span className="ml-auto text-xs text-muted-foreground">Opcional</span>
          </label>
          {contactRequested && (
            <div className="mt-3 space-y-3 rounded-lg bg-muted/60 p-4 text-left">
              <label htmlFor="public-contact-name" className="block text-sm font-medium">
                Nome <span className="text-xs text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="public-contact-name"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="bg-background"
              />
              <label htmlFor="public-contact-phone" className="block text-sm font-medium">
                Telefone <span className="text-xs text-muted-foreground">(telefone ou e-mail)</span>
              </label>
              <Input
                id="public-contact-phone"
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="bg-background"
              />
              <label htmlFor="public-contact-email" className="block text-sm font-medium">
                E-mail
              </label>
              <Input
                id="public-contact-email"
                autoComplete="email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="bg-background"
              />
              <label className="flex items-start gap-3 text-xs">
                <Checkbox
                  aria-label="Autorizar uso dos dados para retorno"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked === true)}
                />
                <span>
                  Autorizo o uso destes dados somente para retorno relacionado à minha avaliação,
                  conforme o aviso de privacidade versão {context.settings.privacyNoticeVersion}.
                </span>
              </label>
              <p className="flex gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />O contato fica separado da
                resposta e não integra indicadores ou relatórios gerais.
              </p>
            </div>
          )}
        </>
      )}
      {validationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-destructive"
        >
          {validationError}
        </div>
      )}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-destructive"
        >
          <p>{error}</p>
          <p className="mt-1 text-xs">
            Se a primeira tentativa já tiver sido registrada, repetir agora não criará outra
            avaliação.
          </p>
        </div>
      )}
      <Button
        className="mt-6 min-h-12 w-full"
        size="lg"
        disabled={sending}
        aria-busy={sending}
        onClick={() => void send()}
      >
        {sending ? (
          <>
            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            Enviando avaliação...
          </>
        ) : error ? (
          "Tentar novamente"
        ) : (
          "Enviar avaliação"
        )}
      </Button>
    </Screen>
  );
}

function Unavailable({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Screen registryName="CartoQuali" pointName="Avaliação">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Screen>
  );
}

function Screen({
  registryName,
  pointName,
  children,
}: {
  registryName: string;
  pointName: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center overflow-x-hidden bg-background p-3 sm:p-4">
      <main className="min-w-0 w-full max-w-lg rounded-xl border border-glass-border bg-glass p-5 text-center shadow-glass backdrop-blur-xl sm:p-9">
        <div className="mb-7 flex min-w-0 items-center justify-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary font-display font-bold text-primary-foreground">
            C
          </span>
          <div className="min-w-0 text-left">
            <strong className="block font-display">CartoQuali</strong>
            <small className="block truncate text-muted-foreground">
              {registryName} · {pointName}
            </small>
          </div>
        </div>
        {children}
        <p className="mt-7 text-[11px] text-muted-foreground">
          Sem conta · identificação opcional somente para retorno
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          <Button asChild variant="link" size="sm" className="h-auto text-xs">
            <Link to="/privacidade">Privacidade</Link>
          </Button>
          <Button asChild variant="link" size="sm" className="h-auto text-xs">
            <Link to="/termos">Termos de uso</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
