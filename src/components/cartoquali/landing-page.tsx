import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
  Copy,
  Database,
  EyeOff,
  Gauge,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquareText,
  QrCode,
  Quote,
  Scale,
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
import { leadOriginFromSearch, type LeadCta } from "@/lib/lead-origin";
import {
  DashboardScene,
  EvaluationPhone,
  GoogleInviteScene,
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

// Only claims from the verified normative arguments (out/2026); never cite a norm outside them.
const normativeReferences: Array<[string, string, string]> = [
  [
    "PQTA (ANOREG/BR)",
    "Entre os critérios da edição 2026 estão o controle de indicadores de desempenho e a avaliação da satisfação dos usuários. A auditoria independente pede evidência com histórico.",
    "O painel guarda indicadores por serviço e período, todos os dias.",
  ],
  [
    "ISO 9001 e ABNT NBR 15906",
    "São a referência da lista de verificação do PQTA. A ISO 9001 pede monitorar a percepção dos clientes e tratar não conformidades com ação corretiva.",
    "A avaliação negativa vira ocorrência com responsável, prazo e plano de ação, que é o registro que o auditor procura.",
  ],
  [
    "Lei nº 13.460/2017",
    "Prevê a avaliação continuada da satisfação do usuário de serviços públicos, por pesquisa feita no mínimo uma vez por ano, e se aplica de forma subsidiária aos serviços prestados por particular, como a atividade notarial e registral, exercida por delegação.",
    "A pesquisa contínua pelo QR Code vai além do mínimo anual.",
  ],
  [
    "Ouvidoria e corregedoria",
    "Reclamações chegam à ouvidoria e à corregedoria.",
    "O registro das avaliações e do plano de melhoria demonstra gestão diligente.",
  ],
];

// Illustrative example of the real flow: the occurrence is created from the evaluation by staff.
const improvementFlow: Array<{ step: string; does: string; example: string; detail: string }> = [
  {
    step: "Avaliação",
    does: "A nota baixa chega ao painel destacada.",
    example: "Nota 2 em tempo de atendimento",
    detail: "“Esperei muito para reconhecer firma.”",
  },
  {
    step: "Ocorrência",
    does: "Com um clique, a avaliação vira ocorrência.",
    example: "Responsável: gestor do atendimento",
    detail: "Prazo de 5 dias, com histórico de cada mudança.",
  },
  {
    step: "Plano de melhoria",
    does: "A equipe define a ação e acompanha a execução.",
    example: "Guichê separado para reconhecimento de firma",
    detail: "Ações, responsáveis e prazos registrados.",
  },
  {
    step: "Resultado",
    does: "Os indicadores mostram se a ação funcionou.",
    example: "Tempo de atendimento: de 3,1 para 4,3",
    detail: "Comparação com o mês anterior.",
  },
];

const securityItems: Array<[LucideIcon, string, string]> = [
  [
    Database,
    "Cada cartório só vê os próprios dados",
    "O isolamento entre cartórios é garantido no banco de dados, e não apenas escondido na tela.",
  ],
  [
    KeyRound,
    "Acesso conforme o perfil",
    "Administrador do cartório, gestor e operador veem e fazem só o que o perfil permite. As operações ficam registradas no histórico de auditoria.",
  ],
  [
    EyeOff,
    "O cidadão não precisa se identificar",
    "A avaliação não pede nome nem cadastro. O contato para retorno é opcional, fica separado da avaliação, só administradores autorizados o veem e ele não entra em indicadores nem em relatórios gerais.",
  ],
  [
    Scale,
    "LGPD na prática",
    "O cartório é o controlador e o CartoQuali, o operador. Pedidos de titulares chegam por um canal de privacidade, e os prazos de guarda são definidos pelo cartório.",
  ],
  [
    ShieldCheck,
    "Sem rastreadores",
    "As páginas do CartoQuali não carregam anúncios, rastreadores nem scripts de terceiros, e a conexão é sempre protegida.",
  ],
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

// Benefits limited to what the invite really does; never promise ratings, ranking or volume.
const googleBenefits: Array<[LucideIcon, string, string]> = [
  [
    MessageSquareText,
    "O perfil mostra o atendimento de todo dia",
    "Quem sai insatisfeito costuma procurar o Google sozinho. Quem sai satisfeito vai embora sem dizer nada. O convite chega a todos, e o perfil passa a refletir a rotina real do cartório.",
  ],
  [
    MapPin,
    "Mais fácil de encontrar e de escolher",
    "Avaliações recentes ajudam quem pesquisa um cartório na cidade a decidir, e o Google considera as avaliações na visibilidade do perfil.",
  ],
  [
    Copy,
    "Sem digitar duas vezes",
    "Se o cidadão escreveu um comentário, ele é copiado. No Google, é só marcar as estrelas e colar. Leva poucos segundos.",
  ],
  [
    ShieldCheck,
    "Dentro das regras do Google",
    "O mesmo convite aparece para qualquer nota, com o botão “Agora não” do mesmo tamanho. Sem filtrar notas e sem texto sugerido, o perfil do cartório fica protegido.",
  ],
];

const launchPrice = {
  label: "R$ 79,90",
  reais: "79",
  cents: "90",
  perDay: "menos de R$ 2,70 por dia",
};

const priceTerms = [
  "Valor garantido enquanto a assinatura estiver ativa",
  "Sem cartão de crédito para testar",
  "Pagamento mensal por PIX, boleto ou transferência",
  "Sem taxa de implantação e sem fidelidade",
];

const includedGroups: Array<[string, string[]]> = [
  [
    "Avaliação",
    [
      "QR Code único com link próprio, para cartaz, balcão e site",
      "Seis perguntas essenciais e perguntas próprias",
      "Serviços conforme as atribuições da serventia",
    ],
  ],
  [
    "Google",
    [
      "Convite para avaliar no Google após cada avaliação",
      "Perfil do Google configurado na implantação",
      "Painel com quantos cidadãos abriram o Google",
    ],
  ],
  [
    "Gestão da qualidade",
    [
      "Indicadores por período e por serviço",
      "Ocorrências com responsável e prazo",
      "Planos de melhoria com histórico",
      "Relatórios em CSV e PDF",
    ],
  ],
  [
    "Equipe e segurança",
    [
      "Usuários com perfis de acesso",
      "Histórico de auditoria das operações",
      "Recursos de privacidade com base na LGPD",
      "Implantação guiada e atendimento pelo WhatsApp",
    ],
  ],
];

// The real hiring flow: lead, setup done by our team, 7-day trial, then monthly payment.
const hiringSteps: Array<[string, string]> = [
  ["Você preenche o formulário", "Leva cerca de um minuto, e a conversa continua no WhatsApp."],
  [
    "Configuramos com você",
    "Nossa equipe cadastra o cartório, os serviços, o QR Code e o perfil do Google.",
  ],
  [
    "7 dias de teste no balcão",
    "O QR Code já recebe avaliações reais, e você acompanha tudo no painel.",
  ],
  [
    "Você decide",
    `Para continuar, ${launchPrice.label} por mês, por PIX, boleto ou transferência. Se não quiser, é só avisar, sem cobrança.`,
  ],
];

type Testimonial = { quote: string; name: string; role: string; registry: string };

// Only real testimonials with the author's written authorization; the section stays hidden while empty.
const testimonials: Testimonial[] = [];

const faqs = [
  [
    "Quanto custa?",
    `${launchPrice.label} por mês, por cartório, com todos os recursos liberados. Quem assina no lançamento mantém esse valor enquanto a assinatura estiver ativa, mesmo quando o preço subir para os próximos cartórios.`,
  ],
  [
    "Preciso de cartão de crédito para testar?",
    "Não. O teste de 7 dias é gratuito e não pede nenhum dado de pagamento.",
  ],
  [
    "Como funciona o pagamento?",
    "A mensalidade é paga por PIX, boleto ou transferência. Ela só começa se você decidir continuar depois dos 7 dias de teste.",
  ],
  [
    "O que acontece depois dos 7 dias?",
    "Conversamos com você. Se quiser continuar, começa a mensalidade. Se não quiser, o acesso é encerrado sem nenhuma cobrança.",
  ],
  [
    "Quem faz a implantação?",
    "Nossa equipe, junto com você, pelo WhatsApp: cadastro do cartório, serviços, QR Code e perfil do Google. Não há taxa de implantação.",
  ],
  [
    "Existe fidelidade ou multa para cancelar?",
    "Não. Você pode cancelar a qualquer momento, sem multa.",
  ],
  [
    "Por que o valor é tão acessível?",
    "Porque estamos em lançamento. Preferimos ter cartórios usando o CartoQuali no dia a dia e ajudando a evoluir o produto do que cobrar o preço cheio desde o início.",
  ],
  [
    "O convite do Google aparece só para quem deu nota alta?",
    "Não. Ele aparece igual para qualquer nota, e o cidadão pode recusar com um toque. Filtrar notas vai contra as regras do Google e pode prejudicar o perfil do cartório.",
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
    "Consigo transformar avaliações negativas em ações?",
    "Sim. Elas ficam destacadas no painel e viram ocorrências e planos de melhoria, com responsável e prazo.",
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

const roleOptions = ["Titular", "Substituto(a)", "Escrevente ou gestor(a)", "Outro cargo"];

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

// Visible fields in form order, so the first invalid one gets the focus.
const leadFields = ["name", "registryName", "cityState", "roleTitle", "whatsapp", "email"] as const;
type LeadField = (typeof leadFields)[number];
type FieldErrors = Partial<Record<LeadField, string>>;
const isLeadField = (key: unknown): key is LeadField =>
  typeof key === "string" && (leadFields as readonly string[]).includes(key);

const commercialWhatsappNumber = "5586981846766";
const defaultWhatsappMessage = "Olá! Quero começar o teste grátis de 7 dias do CartoQuali.";
const createWhatsappUrl = (message = defaultWhatsappMessage) =>
  `https://wa.me/${commercialWhatsappNumber}?text=${encodeURIComponent(message)}`;

// Session-only labels for measuring which link and which button brought each lead.
const originKey = "cartoquali-lead-origin";
const ctaKey = "cartoquali-lead-cta";
function readSession(key: string) {
  try {
    return window.sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}
function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private windows may block storage; the lead is still sent without the label.
  }
}

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

/** Leads to the trial form, remembering which button was used. */
function TrialCta({
  cta,
  children,
  variant = "default",
  className,
  onNavigate,
}: {
  cta: LeadCta;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Button asChild size="lg" variant={variant} className={cn("min-h-11", className)}>
      <a
        href="#formulario-teste"
        onClick={() => {
          writeSession(ctaKey, cta);
          onNavigate?.();
        }}
      >
        {children}
      </a>
    </Button>
  );
}

function CommercialHeader() {
  const [open, setOpen] = useState(false);
  const links = [
    ["#como-funciona", "Como funciona"],
    ["#google", "Google"],
    ["#melhoria", "Melhoria"],
    ["#seguranca", "Segurança"],
    ["#preco", "Preço"],
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
          <TrialCta cta="cabecalho">Testar grátis</TrialCta>
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
            <TrialCta cta="menu-celular" className="min-h-9" onNavigate={() => setOpen(false)}>
              Testar grátis
            </TrialCta>
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
            Pesquisa de satisfação pelo QR Code, indicadores para a gestão e convite para avaliar no
            Google, em um só sistema. Cada reclamação vira uma ação, com responsável e prazo.
          </p>
          <a
            href="#preco"
            className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-brand-gold/50 bg-brand-gold/10 px-4 py-2.5 text-sm transition-colors hover:bg-brand-gold/20"
          >
            <span className="font-display font-bold">
              {launchPrice.label} por mês, garantido para quem assina no lançamento.
            </span>
            <span className="text-muted-foreground">Teste 7 dias grátis, sem cartão.</span>
          </a>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <TrialCta cta="topo">
              Começar teste grátis <ArrowRight />
            </TrialCta>
            <Button asChild size="lg" variant="outline" className="min-h-11">
              <a href="#como-funciona">
                Ver como funciona <ArrowDown />
              </a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {[
              "7 dias grátis",
              "Sem cartão de crédito",
              "Sem fidelidade",
              "Implantação feita pela nossa equipe",
              "Sem aplicativo para o cidadão",
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

function ImprovementSection() {
  return (
    <section
      id="melhoria"
      className="scroll-mt-20 border-b border-border bg-foreground py-20 text-background sm:py-24"
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            dark
            eyebrow="Da avaliação à ação"
            title="Uma avaliação negativa não termina no comentário"
            description="Diferente de uma pesquisa de satisfação comum, o CartoQuali leva o problema até a solução e mede o resultado."
          />
          <div className="shrink-0">
            <TrialCta cta="fluxo" variant="secondary">
              Começar teste grátis <ArrowRight />
            </TrialCta>
          </div>
        </div>
        <p className="mt-12 text-right text-[11px] font-semibold uppercase tracking-wide text-background/75">
          Exemplo ilustrativo
        </p>
        <ol className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {improvementFlow.map(({ step, does, example, detail }, index) => {
            const last = index === improvementFlow.length - 1;
            return (
              <li
                key={step}
                className={cn(
                  "relative flex flex-col rounded-xl border p-5",
                  last
                    ? "border-brand-gold bg-brand-gold/10"
                    : "border-background/20 bg-background/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
                      last ? "bg-brand-gold text-foreground" : "bg-background/15",
                    )}
                  >
                    {index + 1}
                  </span>
                  <h3 className={cn("font-display text-lg font-bold", last && "text-brand-gold")}>
                    {step}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-background/80">{does}</p>
                <div className="mt-auto pt-5">
                  <div className="rounded-lg bg-card p-3 text-foreground">
                    <p className="text-sm font-semibold leading-5">{example}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                  </div>
                </div>
                {!last && (
                  <ArrowRight
                    className="absolute -right-4 top-7 z-10 hidden size-5 text-brand-gold xl:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="seguranca" className="scroll-mt-20 border-b border-border bg-card py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <div className="mb-6 grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" />
          </div>
          <SectionTitle
            eyebrow="Segurança e privacidade"
            title="Os dados do cartório e do cidadão protegidos de verdade"
            description="Proteção pensada no próprio sistema, com base na LGPD, e não só em uma promessa no rodapé."
          />
          <Link
            to="/privacidade"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
          >
            Ler o aviso de privacidade
          </Link>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {securityItems.map(([Icon, title, text]) => (
            <li key={title} className="border-t border-border py-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Icon className="size-4 shrink-0 text-success" aria-hidden="true" />
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function NormsSection() {
  return (
    <section
      id="normas"
      className="scroll-mt-20 border-b border-border bg-secondary/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Normas, certificação e PQTA"
          title="Satisfação medida com evidência, todos os dias"
          description="Prêmios e certificações do setor avaliam se o cartório mede a satisfação de quem atende e trata o resultado, com histórico que comprove. O CartoQuali gera essa evidência no dia a dia, e não só na véspera da auditoria."
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {normativeReferences.map(([title, reference, evidence]) => (
            <li key={title} className="flex flex-col rounded-lg border border-border bg-card p-5">
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{reference}</p>
              <p className="mt-4 flex gap-2 border-t border-border pt-4 text-sm font-semibold leading-6">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                {evidence}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-3xl border-l-2 border-brand-gold pl-4 text-xs leading-5 text-muted-foreground">
            O CartoQuali é uma ferramenta independente, sem vínculo com a ANOREG/BR, o PQTA, o CNJ
            ou corregedorias. Nenhuma norma exige o uso do CartoQuali, e ele não garante prêmio,
            pontuação ou certificação. Ele organiza a evidência que o seu cartório apresenta.
          </p>
          <div className="shrink-0">
            <TrialCta cta="normas">
              Começar teste grátis <ArrowRight />
            </TrialCta>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleSection() {
  return (
    <section
      id="google"
      className="scroll-mt-20 border-b border-border bg-secondary/40 py-20 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <SectionTitle
            eyebrow="Avaliações no Google"
            title="Quem foi bem atendido agora também ajuda o cartório a ser encontrado"
            description="Depois de avaliar no CartoQuali, o cidadão recebe o convite para deixar a opinião também no perfil do cartório no Google. A avaliação interna vira gestão, e a pública vira reputação."
          />
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {googleBenefits.map(([Icon, title, text]) => (
              <li key={title}>
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <Icon className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs leading-5 text-muted-foreground">
            No painel, você acompanha quantos cidadãos abriram o Google, por cartório e por ponto de
            avaliação, nunca por funcionário. O CartoQuali não tem vínculo com o Google e não
            controla o que é publicado lá.
          </p>
        </div>
        <div className="pb-8">
          <GoogleInviteScene />
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  if (testimonials.length === 0) return null;
  return (
    <section className="border-b border-border bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Quem já usa" title="O que dizem os cartórios" />
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ quote, name, role, registry }) => (
            <li key={name}>
              <figure className="flex h-full flex-col rounded-lg border border-border bg-background p-6">
                <Quote className="size-6 text-brand-gold" aria-hidden="true" />
                <blockquote className="mt-3 flex-1 leading-7">{quote}</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{name}</span>
                  <span className="block text-muted-foreground">
                    {role}, {registry}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="preco" className="scroll-mt-20 border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <SectionTitle
          center
          eyebrow="Preço de lançamento"
          title="Tudo liberado, por um valor que cabe em qualquer cartório"
          description="Sem plano básico e sem recurso escondido. O cartório que entra agora usa o CartoQuali completo e mantém este valor."
        />
        <div className="mt-12 grid overflow-hidden rounded-2xl border border-border shadow-glass lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col bg-foreground p-8 text-background sm:p-10">
            <p className="w-fit rounded-full border border-brand-gold/60 px-3 py-1 text-xs font-semibold text-brand-gold">
              Período de lançamento
            </p>
            <p className="mt-8 flex items-start font-display font-bold leading-none">
              <span className="mt-3 text-2xl">R$</span>
              <span className="ml-1 text-8xl tracking-tight">{launchPrice.reais}</span>
              <span className="mt-3 text-4xl">,{launchPrice.cents}</span>
            </p>
            <p className="mt-3 text-base text-background/75">
              por mês, por cartório. É {launchPrice.perDay}.
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-gold">
              Você só paga se continuar depois dos 7 dias de teste.
            </p>
            <ul className="mt-8 space-y-2.5 text-sm">
              {priceTerms.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-gold" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <TrialCta cta="preco" variant="secondary" className="min-h-12 w-full">
                Começar teste grátis <ArrowRight />
              </TrialCta>
              <a
                href={createWhatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block text-center text-sm font-semibold text-background/80 underline underline-offset-4 hover:text-background"
              >
                Prefiro falar direto pelo WhatsApp
              </a>
            </div>
          </div>
          <div className="bg-card p-8 sm:p-10">
            <h3 className="font-display text-xl font-bold">O que está incluído</h3>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {includedGroups.map(([group, items]) => (
                <div key={group}>
                  <h4 className="font-display text-sm font-bold text-primary">{group}</h4>
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6">
                        <CheckCircle2
                          className="mt-1 size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h3 className="font-display text-xl font-bold">Como funciona a contratação</h3>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2">
              {hiringSteps.map(([title, text], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card font-display text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-display font-bold">{title}</h4>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-brand-gold/50 bg-brand-gold/10 p-6">
            <h3 className="font-display text-lg font-bold">Por que um valor tão baixo?</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Porque estamos em lançamento. Queremos cartórios usando o CartoQuali de verdade, no
              balcão, e nos dizendo o que melhorar. Em troca, quem entra agora paga um valor de
              entrada, bem abaixo do que o produto vai custar. O preço de lançamento é por tempo
              limitado e será revisto para os próximos cartórios.
            </p>
            <p className="mt-3 text-sm font-semibold leading-6">
              Quem assina no lançamento continua pagando {launchPrice.label} por mês enquanto a
              assinatura estiver ativa, mesmo quando o preço subir.
            </p>
          </div>
        </div>
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
            Medir de forma contínua a percepção de quem é atendido ajuda o cartório a acompanhar a
            qualidade no dia a dia, e não só na época de uma avaliação.
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
            description="Preço, pagamento, implantação e o dia a dia do sistema, em respostas diretas."
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

function TrialForm() {
  const submitLead = useServerFn(submitCommercialLead);
  const [draft, setDraft] = useState<LeadDraft>(emptyLead);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const change = (key: keyof LeadDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const getSession = () => {
    const key = "cartoquali-commercial-session";
    const found = readSession(key);
    if (found) return found;
    const created = crypto.randomUUID();
    writeSession(key, created);
    return created;
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    const payload: CommercialLeadInput = {
      ...draft,
      clientRequestId: crypto.randomUUID(),
      submissionSession: getSession(),
      origin: readSession(originKey),
      cta: readSession(ctaKey),
    };
    const checked = commercialLeadSchema.safeParse(payload);
    if (!checked.success) {
      const found: FieldErrors = {};
      for (const issue of checked.error.issues) {
        const key = issue.path[0];
        if (isLeadField(key) && !found[key]) found[key] = issue.message;
      }
      const first = leadFields.find((key) => found[key]);
      setErrors(found);
      setStatus("error");
      setMessage(
        first
          ? "Preencha os campos destacados para continuar."
          : (checked.error.issues[0]?.message ?? "Revise os campos informados."),
      );
      if (first) document.getElementById(`lead-${first}`)?.focus();
      return;
    }
    setErrors({});
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
    <section id="teste-gratis" className="bg-foreground py-20 text-background sm:py-24">
      <div className="mx-auto grid max-w-7xl 2xl:max-w-[1600px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <SectionTitle
            dark
            eyebrow="Teste grátis"
            title="Comece seus 7 dias grátis"
            description="Preencha os dados e continue a conversa pelo WhatsApp. Nossa equipe configura o cartório com você."
          />
          <ul className="mt-8 space-y-3 text-sm text-background/80">
            {[
              "Sem cartão de crédito e sem compromisso",
              "Implantação feita pela nossa equipe, sem taxa",
              "Se preferir, pedimos uma demonstração antes na conversa",
              `Depois do teste, ${launchPrice.label} por mês, com o valor garantido`,
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div
          id="formulario-teste"
          className="scroll-mt-24 rounded-xl bg-background p-5 text-foreground shadow-2xl sm:p-8"
        >
          <div>
            <h3 className="font-display text-2xl font-bold">Começar teste grátis</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Leva cerca de um minuto. Todos os campos são obrigatórios, e o e-mail é usado para
              criar o seu acesso.
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
                  name="name"
                  label="Nome"
                  value={draft.name}
                  error={errors.name}
                  onChange={(value) => change("name", value)}
                  autoComplete="name"
                  maxLength={100}
                />
                <Field
                  name="registryName"
                  label="Cartório"
                  value={draft.registryName}
                  error={errors.registryName}
                  onChange={(value) => change("registryName", value)}
                  autoComplete="organization"
                  maxLength={160}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="cityState"
                  label="Cidade/UF"
                  value={draft.cityState}
                  error={errors.cityState}
                  onChange={(value) => change("cityState", value)}
                  autoComplete="address-level2"
                  maxLength={120}
                />
                <div className="grid content-start gap-1.5 text-sm font-semibold">
                  <label htmlFor="lead-roleTitle">Cargo</label>
                  <select
                    id="lead-roleTitle"
                    required
                    value={draft.roleTitle}
                    aria-invalid={errors.roleTitle ? true : undefined}
                    aria-describedby={errors.roleTitle ? "lead-roleTitle-error" : undefined}
                    onChange={(event) => change("roleTitle", event.target.value)}
                    className={cn(
                      "h-11 rounded-md border border-input bg-card px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      errors.roleTitle && "border-destructive",
                    )}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <FieldError id="lead-roleTitle-error" message={errors.roleTitle} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="whatsapp"
                  label="WhatsApp com DDD"
                  type="tel"
                  value={draft.whatsapp}
                  error={errors.whatsapp}
                  onChange={(value) => change("whatsapp", value)}
                  autoComplete="tel"
                  maxLength={30}
                />
                <Field
                  name="email"
                  label="E-mail"
                  type="email"
                  value={draft.email}
                  error={errors.email}
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
                {status === "sending" ? "Enviando..." : "Enviar e continuar no WhatsApp"}
                <ArrowRight />
              </Button>
              <p className="text-center text-sm font-semibold">
                7 dias grátis, sem cartão de crédito. Cancele quando quiser, sem multa.
              </p>
              <p className="text-center text-xs leading-4 text-muted-foreground">
                Seus dados serão usados apenas para responder à solicitação comercial pelo WhatsApp.
                Veja o{" "}
                <Link to="/privacidade" target="_blank" rel="noopener" className="underline">
                  aviso de privacidade
                </Link>
                .
              </p>
              <a
                href={createWhatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm font-semibold text-primary underline underline-offset-4"
              >
                Prefiro falar direto pelo WhatsApp
              </a>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-semibold text-destructive">
      {message}
    </p>
  );
}

function Field({
  name,
  label,
  value,
  error,
  onChange,
  type = "text",
  ...props
}: {
  name: LeadField;
  label: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  const id = `lead-${name}`;
  return (
    <div className="grid content-start gap-1.5 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        required
        type={type}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn("h-11 bg-card", error && "border-destructive")}
        {...props}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
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
  // Keeps the link's channel (?origem= or utm_*) for the lead, even after in-page navigation.
  useEffect(() => {
    const origin = leadOriginFromSearch(window.location.search);
    if (origin) writeSession(originKey, origin);
  }, []);
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <CommercialHeader />
      <main>
        <Hero />
        <HowItWorks />
        <GoogleSection />
        <IndicatorsSection />
        <ImprovementSection />
        <SecuritySection />
        <SectorSection />
        <NormsSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <TrialForm />
      </main>
      <Footer />
    </div>
  );
}
