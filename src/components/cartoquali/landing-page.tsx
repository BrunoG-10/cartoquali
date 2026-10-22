import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Menu,
  QrCode,
  Settings2,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/cartoquali/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  commercialLeadSchema,
  submitCommercialLead,
  type CommercialLeadInput,
} from "@/lib/commercial-leads.functions";
import {
  DashboardScene,
  EvaluationPhone,
  OccurrenceScene,
  ProductScene,
  QrTotemScene,
} from "./landing-visuals";

const steps: Array<[LucideIcon, string, string]> = [
  [
    Star,
    "O cidadão avalia",
    "O cidadão aponta a câmera para o QR Code do cartório e, se quiser, informa o serviço que utilizou. Responde pelo celular, sem aplicativo nem cadastro.",
  ],
  [
    ClipboardCheck,
    "O CartoQuali organiza",
    "As respostas são separadas por serviço, período e pelos indicadores essenciais: cordialidade, clareza, tempo, instalações e resolução.",
  ],
  [BarChart3, "A gestão acompanha", "Indicadores e tendências reunidos em um painel único."],
  [
    Lightbulb,
    "A equipe melhora",
    "Avaliações negativas viram ocorrências, com responsável, prazo e plano de melhoria.",
  ],
];

const indicatorHighlights = [
  "Satisfação, nota média e resolutividade",
  "Avaliações negativas destacadas",
  "Leitura por período e por serviço",
  "Relatórios para comparar períodos",
];

const productHighlights: Array<[LucideIcon, string, string]> = [
  [
    QrCode,
    "Um QR Code para todo o cartório",
    "O cidadão avalia em um só lugar e informa, se quiser, o serviço que utilizou. Você acompanha os resultados por serviço.",
  ],
  [
    Settings2,
    "Configurado para a sua serventia",
    "Marque as atribuições (Notas, Protesto, Imóveis, Registro Civil…) e os serviços aparecem na avaliação. Seis perguntas essenciais garantem indicadores comparáveis, e você pode acrescentar perguntas próprias.",
  ],
];

const continuousImprovement = [
  "O Código Nacional de Normas do CNJ, com a redação dada pelo Provimento nº 229/2026, adota a melhoria contínua da experiência do usuário como princípio dos serviços eletrônicos de registro.",
  "A Lei nº 13.460/2017, aplicável de forma subsidiária aos serviços públicos prestados por particulares, prevê a avaliação continuada da satisfação dos usuários, com pesquisa ao menos anual.",
  "O PQTA, Prêmio de Qualidade Total Anoreg promovido pela ANOREG/BR, avalia a gestão dos cartórios com base em requisitos como o controle de indicadores de desempenho e a avaliação da satisfação dos usuários.",
];

const actionFlow = ["Avaliação", "Ocorrência", "Plano de melhoria", "Resultado"];

const privacyItems = [
  "Avaliação sem identificação por padrão",
  "Contato opcional e separado",
  "Minimização de dados",
  "Controle de acesso por perfil",
  "Isolamento entre cartórios",
  "Auditoria das operações",
];

const audiences: Array<[LucideIcon, string, string]> = [
  [
    UserRound,
    "Titular e responsáveis",
    "Acompanham a qualidade percebida e a evolução do cartório.",
  ],
  [Gauge, "Gestores", "Identificam problemas e decidem onde agir com base em indicadores."],
  [Users, "Equipe", "Sabe com clareza quais pontos do atendimento precisam de atenção."],
];

const trialOffer = {
  title: "Teste grátis por 7 dias.",
  detail: "Depois, cancele quando quiser, sem multa.",
};

const faqs = [
  [
    "Posso testar antes de contratar?",
    "Sim. Você usa o CartoQuali gratuitamente por 7 dias, com o seu cartório, antes de decidir.",
  ],
  [
    "Existe fidelidade ou multa para cancelar?",
    "Não. Você pode cancelar a qualquer momento, sem multa.",
  ],
  ["Preciso instalar um aplicativo?", "Não. A avaliação funciona no navegador do celular."],
  [
    "O usuário precisa criar uma conta?",
    "Não. Ele avalia sem cadastro e só informa contato se quiser retorno.",
  ],
  [
    "Preciso de um QR Code para cada setor?",
    "Não. Um único QR Code atende todo o cartório; o cidadão informa o serviço, se quiser.",
  ],
  [
    "Posso personalizar as perguntas?",
    "Sim. As seis perguntas essenciais podem ter o texto ajustado, e você pode acrescentar perguntas próprias.",
  ],
  [
    "Consigo acompanhar avaliações negativas?",
    "Sim. Elas ficam destacadas no painel e podem virar ocorrências.",
  ],
  [
    "Consigo transformar problemas em ações?",
    "Sim, por meio de ocorrências e planos de melhoria com responsável e prazo.",
  ],
  [
    "O CartoQuali é uma ferramenta oficial da ANOREG ou do PQTA?",
    "Não. O CartoQuali é independente e não tem vínculo com a ANOREG/BR nem com o PQTA. Ele ajuda o cartório a acompanhar a satisfação dos usuários, um dos requisitos avaliados pelo prêmio.",
  ],
  [
    "O sistema substitui uma avaliação oficial?",
    "Não. Ele é uma ferramenta contínua de acompanhamento e gestão da qualidade.",
  ],
] as const;

const emptyLead = {
  name: "",
  registryName: "",
  cityState: "",
  roleTitle: "",
  whatsapp: "",
  email: "",
  website: "",
};
type LeadDraft = typeof emptyLead;

const commercialWhatsappNumber = "5586981846766";
const defaultWhatsappMessage =
  "Olá! Quero conhecer o CartoQuali e começar o teste grátis de 7 dias.";
const createWhatsappUrl = (message = defaultWhatsappMessage) =>
  `https://wa.me/${commercialWhatsappNumber}?text=${encodeURIComponent(message)}`;

function Brand() {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogoMark size={40} />
      <span>
        <Wordmark className="block text-lg leading-none" />
        <small className="text-xs text-muted-foreground">Qualidade para cartórios</small>
      </span>
    </Link>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  center = false,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-wider",
          dark ? "text-brand-gold" : "text-accent-foreground",
        )}
      >
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-7 sm:text-lg",
            dark ? "text-background/75" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function AnchorCta({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button asChild size="lg" variant={variant} className="min-h-11">
      <a href={createWhatsappUrl()} target="_blank" rel="noreferrer">
        {children}
      </a>
    </Button>
  );
}

function CommercialHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["#como-funciona", "Como funciona"],
    ["#indicadores", "Indicadores"],
    ["#privacidade", "Privacidade"],
    ["#faq", "Perguntas"],
  ] as const;
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl 2xl:max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Navegação comercial">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost">
            <Link to="/login">Entrar</Link>
          </Button>
          <AnchorCta>Solicitar demonstração</AnchorCta>
        </div>
        <Button
          className="sm:hidden"
          variant="ghost"
          size="icon"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 pb-5 sm:hidden">
          <nav className="grid py-3" aria-label="Navegação móvel">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-sm font-medium"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <a
                href={createWhatsappUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
              >
                Demonstração
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div aria-hidden="true" className="absolute inset-0 landing-grid opacity-40" />
      <div className="relative mx-auto grid max-w-7xl 2xl:max-w-[1600px] items-center gap-12 px-4 py-10 sm:px-6 sm:py-16 lg:min-h-[680px] lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="animate-enter">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Gestão da qualidade para cartórios
          </p>
          <h1 className="mt-6 max-w-2xl font-display text-[2.1rem] font-bold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
            A voz de quem é atendido, transformada em gestão da qualidade.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            O cidadão avalia o atendimento pelo QR Code, em poucos instantes. Sua equipe acompanha
            os indicadores e transforma cada problema em ação de melhoria.
          </p>
          <p className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-brand-gold/50 bg-brand-gold/10 px-4 py-2.5 text-sm">
            <span className="font-display font-bold">{trialOffer.title}</span>
            <span className="text-muted-foreground">{trialOffer.detail}</span>
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <AnchorCta>
              Solicitar demonstração <ArrowRight />
            </AnchorCta>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">
                Ver como funciona <ArrowDown />
              </a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {[
              "7 dias grátis",
              "Sem multa para cancelar",
              "Sem aplicativo",
              "Sem cadastro do cidadão",
              "Desenvolvido com base na LGPD",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-enter pb-10 sm:px-8 lg:pb-0">
          <ProductScene />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="scroll-mt-20 border-b border-border bg-card py-20 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <SectionTitle eyebrow="Como funciona" title="Da avaliação à melhoria, em quatro passos" />
          <ol className="mt-10 space-y-6">
            {steps.map(([Icon, title, text], index) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background font-display text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                    <Icon className="size-4 text-accent-foreground" aria-hidden="true" />
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-xs leading-5 text-muted-foreground">
            A avaliação não identifica o cidadão no cadastro do CartoQuali, por padrão. Dados
            técnicos de acesso podem existir; por isso não prometemos anonimato absoluto.
          </p>
        </div>
        <div className="grid grid-cols-1 place-items-center gap-6 rounded-xl bg-secondary/60 px-6 py-12 sm:grid-cols-2">
          <QrTotemScene />
          <EvaluationPhone />
        </div>
      </div>
    </section>
  );
}

function IndicatorsSection() {
  return (
    <section id="indicadores" className="scroll-mt-20 border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Indicadores"
          title="Indicadores claros para decidir onde agir"
          description="Acompanhe a qualidade percebida por período e por serviço, do jeito que o seu cartório se organiza. Compare períodos e veja se as ações estão dando resultado."
        />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.35fr_0.65fr]">
          <DashboardScene />
          <div>
            <ul className="space-y-3">
              {indicatorHighlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm sm:text-base">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-3">
              {productHighlights.map(([Icon, title, text]) => (
                <div key={title} className="rounded-lg border border-border bg-card p-4">
                  <h3 className="flex items-center gap-2 font-display font-bold">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionSection() {
  return (
    <section className="border-b border-border bg-foreground py-20 text-background sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionTitle
            dark
            eyebrow="Da avaliação à ação"
            title="Uma avaliação negativa não termina no comentário"
            description="Diferente de uma pesquisa de satisfação comum, o CartoQuali leva o problema até a solução e mede o resultado."
          />
          <ol className="mt-8 flex flex-wrap items-center gap-2 text-sm font-semibold">
            {actionFlow.map((item, index) => (
              <li key={item} className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border px-3 py-2",
                    index === actionFlow.length - 1
                      ? "border-brand-gold bg-brand-gold/15 text-brand-gold"
                      : "border-background/20 bg-background/5",
                  )}
                >
                  {item}
                </span>
                {index < actionFlow.length - 1 && (
                  <ArrowRight className="size-4 text-background/50" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <AnchorCta variant="secondary">
              Quero conhecer <ArrowRight />
            </AnchorCta>
          </div>
        </div>
        <div className="text-foreground">
          <OccurrenceScene />
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section
      id="privacidade"
      className="scroll-mt-20 border-b border-border bg-card py-20 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <div className="mb-6 grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" />
          </div>
          <SectionTitle
            eyebrow="LGPD e privacidade"
            title="Privacidade desde a primeira resposta"
            description="Recursos técnicos pensados com base nos princípios de proteção de dados pessoais."
          />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {privacyItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-4 text-sm font-semibold"
            >
              <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectorSection() {
  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionTitle eyebrow="Feito para cartórios" title="Pensado para a rotina do cartório" />
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            A melhoria contínua do atendimento aparece em diferentes referências do setor:
          </p>
          <ul className="mt-4 space-y-3">
            {continuousImprovement.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Medir de forma contínua a percepção de quem é atendido ajuda o cartório a acompanhar a
            qualidade no dia a dia, e não só na época de uma avaliação.
          </p>
          <p className="mt-8 border-l-2 border-brand-gold pl-4 text-xs leading-5 text-muted-foreground">
            O CartoQuali é uma plataforma independente, sem vínculo com a ANOREG/BR, o PQTA ou o
            CNJ, e não substitui avaliações, certificações ou programas oficiais do setor.
          </p>
        </div>
        <ul className="grid content-center gap-3">
          {audiences.map(([Icon, title, text]) => (
            <li key={title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-border bg-card py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:px-8">
        <div>
          <CircleHelp className="mb-6 size-9 text-primary" aria-hidden="true" />
          <SectionTitle
            eyebrow="Perguntas frequentes"
            title="Ainda tem dúvidas?"
            description="Respostas diretas para avaliar se o CartoQuali faz sentido para o seu cartório."
          />
        </div>
        <Accordion type="single" collapsible className="border-t border-border">
          {faqs.map(([question, answer], index) => (
            <AccordionItem key={question} value={`faq-${index}`}>
              <AccordionTrigger className="text-base">{question}</AccordionTrigger>
              <AccordionContent className="leading-6 text-muted-foreground">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function DemoForm() {
  const submitLead = useServerFn(submitCommercialLead);
  const [draft, setDraft] = useState<LeadDraft>(emptyLead);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [message, setMessage] = useState("");
  const change = (key: keyof LeadDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const getSession = () => {
    const key = "cartoquali-commercial-session";
    const found = window.sessionStorage.getItem(key);
    if (found) return found;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    const payload: CommercialLeadInput = {
      ...draft,
      clientRequestId: crypto.randomUUID(),
      submissionSession: getSession(),
    };
    const checked = commercialLeadSchema.safeParse(payload);
    if (!checked.success) {
      setStatus("error");
      setMessage(checked.error.issues[0]?.message ?? "Revise os campos informados.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      await submitLead({ data: checked.data });
      setStatus("success");
      const whatsappMessage = [
        defaultWhatsappMessage,
        "",
        `Nome: ${checked.data.name}`,
        `Cartório: ${checked.data.registryName}`,
        `Cidade/UF: ${checked.data.cityState}`,
        `Cargo: ${checked.data.roleTitle}`,
        `WhatsApp: ${checked.data.whatsapp}`,
        `E-mail: ${checked.data.email}`,
      ].join("\n");
      const url = createWhatsappUrl(whatsappMessage);
      // Kept for the success panel: if WhatsApp does not open, the visitor still has the link.
      setWhatsappLink(url);
      window.location.assign(url);
    } catch (reason) {
      setStatus("error");
      setMessage(
        reason instanceof Error ? reason.message : "Não foi possível enviar. Tente novamente.",
      );
    }
  };
  return (
    <section id="demonstracao" className="bg-foreground py-20 text-background sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <SectionTitle
            dark
            eyebrow="Demonstração"
            title="Veja o CartoQuali funcionando no seu cartório"
            description="Mostramos a jornada de avaliação, os indicadores e o fluxo de melhoria com exemplos da rotina de um cartório."
          />
          <ul className="mt-8 space-y-3 text-sm text-background/80">
            {[
              "Conheça a avaliação pelo QR Code",
              "Veja os indicadores em contexto",
              "Entenda o fluxo de ocorrências e planos",
              "Teste grátis por 7 dias, sem multa se cancelar",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="size-4 text-brand-gold" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div
          id="formulario-demonstracao"
          className="scroll-mt-24 rounded-xl bg-background p-5 text-foreground shadow-2xl sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
              Solicitar demonstração
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold">Quero conhecer o CartoQuali</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Preencha os dados e continue a conversa pelo WhatsApp.
            </p>
          </div>
          {status === "success" ? (
            <div
              role="status"
              className="mt-8 rounded-lg bg-success-soft p-6 text-center text-success"
            >
              <CheckCircle2 className="mx-auto size-9" />
              <p className="mt-3 font-display text-xl font-bold">Solicitação recebida.</p>
              <p className="mt-2 text-sm">Abrindo a conversa no WhatsApp.</p>
              <p className="mt-4 text-sm text-foreground">
                Não abriu?{" "}
                <a
                  href={whatsappLink || createWhatsappUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Abrir conversa no WhatsApp
                </a>
                <br />
                <span className="text-muted-foreground">ou escreva para cartoquali@gmail.com</span>
              </p>
            </div>
          ) : (
            <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>
                  Website
                  <Input
                    tabIndex={-1}
                    autoComplete="off"
                    value={draft.website}
                    onChange={(event) => change("website", event.target.value)}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nome"
                  value={draft.name}
                  onChange={(value) => change("name", value)}
                  autoComplete="name"
                  maxLength={100}
                />
                <Field
                  label="Cartório"
                  value={draft.registryName}
                  onChange={(value) => change("registryName", value)}
                  autoComplete="organization"
                  maxLength={160}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Cidade/UF"
                  value={draft.cityState}
                  onChange={(value) => change("cityState", value)}
                  autoComplete="address-level2"
                  maxLength={120}
                />
                <Field
                  label="Cargo"
                  value={draft.roleTitle}
                  onChange={(value) => change("roleTitle", value)}
                  autoComplete="organization-title"
                  maxLength={100}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="WhatsApp"
                  type="tel"
                  value={draft.whatsapp}
                  onChange={(value) => change("whatsapp", value)}
                  autoComplete="tel"
                  maxLength={30}
                />
                <Field
                  label="E-mail"
                  type="email"
                  value={draft.email}
                  onChange={(value) => change("email", value)}
                  autoComplete="email"
                  maxLength={255}
                />
              </div>
              {status === "error" && (
                <p
                  role="alert"
                  className="rounded-md bg-danger-soft px-3 py-2 text-sm text-destructive"
                >
                  {message}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="mt-1 min-h-12 w-full"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Enviando..." : "Enviar e conversar no WhatsApp"}
                <ArrowRight />
              </Button>
              <p className="text-center text-sm font-semibold">
                {trialOffer.title} {trialOffer.detail}
              </p>
              <p className="text-center text-xs leading-4 text-muted-foreground">
                Seus dados serão usados apenas para responder à solicitação comercial pelo WhatsApp.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      <Input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 bg-card"
        {...props}
      />
    </label>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Seu cartório ouve seus usuários. O CartoQuali transforma essa percepção em gestão da
            qualidade.
          </p>
          <p className="mt-2 font-display text-sm font-bold">Avalie. Meça. Identifique. Melhore.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <a href="#como-funciona" className="hover:text-primary">
            Como funciona
          </a>
          <Link to="/privacidade" className="hover:text-primary">
            Privacidade
          </Link>
          <Link to="/termos" className="hover:text-primary">
            Termos
          </Link>
          <a
            href={createWhatsappUrl()}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary"
          >
            WhatsApp
          </a>
          <a href="mailto:cartoquali@gmail.com" className="hover:text-primary">
            cartoquali@gmail.com
          </a>
          <Link to="/login" className="hover:text-primary">
            Acessar sistema
          </Link>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © 2026 CartoQuali. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <CommercialHeader />
      <main>
        <Hero />
        <HowItWorks />
        <IndicatorsSection />
        <ActionSection />
        <PrivacySection />
        <SectorSection />
        <FaqSection />
        <DemoForm />
      </main>
      <Footer />
    </div>
  );
}
