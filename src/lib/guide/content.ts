import type { AppModule } from "@/lib/permissions";

// Guia de uso — único lugar com os textos do tour. Spec: docs/superpowers/specs/2026-10-07-guia-de-uso-design.md
// `target` é o valor do atributo data-tour na tela; null = balão centralizado, sem destaque.

export type GuideGroup = "acompanhar" | "agir" | "coletar" | "admin";
export type GuidePage = { path: string; label: string; module: AppModule; group: GuideGroup };
export type GuideStep = { page: string; target: string | null; title: string; text: string };

export const GUIDE_PAGES: readonly GuidePage[] = [
  { path: "/dashboard", label: "Painel", module: "dashboard", group: "acompanhar" },
  { path: "/qualidade", label: "Qualidade", module: "quality", group: "acompanhar" },
  { path: "/avaliacoes", label: "Avaliações", module: "evaluations", group: "acompanhar" },
  { path: "/relatorios", label: "Relatórios", module: "reports", group: "acompanhar" },
  { path: "/visao-executiva", label: "Visão executiva", module: "reports", group: "acompanhar" },
  { path: "/ocorrencias", label: "Ocorrências", module: "occurrences", group: "agir" },
  { path: "/planos-melhoria", label: "Planos de melhoria", module: "plans", group: "agir" },
  { path: "/pesquisas", label: "Pesquisas", module: "surveys", group: "coletar" },
  { path: "/pontos", label: "QR Code", module: "points", group: "coletar" },
  { path: "/cartorio", label: "Cartório", module: "registry", group: "admin" },
  { path: "/usuarios", label: "Usuários", module: "users", group: "admin" },
  { path: "/configuracoes", label: "Configurações", module: "settings", group: "admin" },
  { path: "/solicitacoes-privacidade", label: "Privacidade", module: "privacy", group: "admin" },
  { path: "/auditoria", label: "Auditoria", module: "audit", group: "admin" },
  { path: "/plataforma", label: "Painel da plataforma", module: "platform", group: "admin" },
  { path: "/implantacoes", label: "Implantações", module: "onboarding", group: "admin" },
];

const step = (page: string, target: string | null, title: string, text: string): GuideStep => ({
  page,
  target,
  title,
  text,
});

// Spec §5 — tour completo (Acompanhar, Agir e Coletar).
export const TOUR_STEPS: readonly GuideStep[] = [
  step(
    "/dashboard",
    "nav-acompanhar",
    "Seu ponto de partida",
    "O Painel mostra, num só lugar, como está a satisfação de quem foi atendido.",
  ),
  step(
    "/dashboard",
    "dashboard-kpis",
    "Os números que importam",
    "Satisfação geral, nota média, avaliações negativas e resolutividade, comparados com o período anterior.",
  ),
  step(
    "/dashboard",
    "dashboard-filters",
    "Escolha o recorte",
    "Troque o período ou veja só um serviço, como Escritura ou Certidões.",
  ),
  step(
    "/dashboard",
    "dashboard-services",
    "Onde está bom e onde melhorar",
    "Cada serviço com sua nota média e o percentual de avaliações negativas.",
  ),
  step(
    "/qualidade",
    "quality-tabs",
    "Olhar de especialista",
    "Aqui os indicadores se abrem por dimensão (cordialidade, clareza, tempo, instalações e resolução) e mostram a evolução no tempo.",
  ),
  step(
    "/avaliacoes",
    "reviews-list",
    "Cada opinião, uma a uma",
    "Veja nota, serviço e comentário de cada avaliação. Clique numa delas para ver todas as respostas.",
  ),
  step(
    "/avaliacoes",
    "reviews-filters",
    "Encontre o que precisa",
    "Busque por comentário ou filtre por nota, classificação e status.",
  ),
  step(
    "/relatorios",
    "reports-catalog",
    "Documentos prontos",
    "Relatórios de qualidade, satisfação, ocorrências e melhorias para imprimir ou exportar em planilha (CSV).",
  ),
  step(
    "/visao-executiva",
    "report-summary",
    "Para quem decide",
    "Um resumo de uma página com os principais números e pontos de atenção, pronto para reunião.",
  ),
  step(
    "/ocorrencias",
    "occurrences-new",
    "Problema identificado vira tarefa",
    "Registre uma ocorrência com responsável, prioridade e prazo. Dá para criar direto de uma avaliação negativa.",
  ),
  step(
    "/ocorrencias",
    "occurrences-list",
    "Acompanhe até resolver",
    "Cada ocorrência passa por Nova → Em análise → Em tratamento → Resolvida, com histórico.",
  ),
  step(
    "/planos-melhoria",
    "plans-new",
    "Da correção à melhoria",
    "Quando um problema se repete, crie um plano com objetivo, ação, responsável e prazo.",
  ),
  step(
    "/planos-melhoria",
    "plans-list",
    "Mostre o resultado",
    "Ao concluir, registre o antes e o depois do indicador para provar que a ação funcionou.",
  ),
  step(
    "/pesquisas",
    "surveys-list",
    "As perguntas da avaliação",
    "Seis perguntas essenciais (com cadeado) garantem indicadores comparáveis; você pode ajustar o texto delas e acrescentar perguntas próprias.",
  ),
  step(
    "/pesquisas",
    "surveys-configure",
    "Veja como o cidadão vê",
    "A prévia mostra a avaliação exatamente como aparece no celular, sem registrar respostas. Ela fica dentro de Configurar.",
  ),
  step(
    "/pontos",
    "qr-card",
    "Um QR Code para todo o cartório",
    "Imprima o cartaz, cole no balcão e pronto: o cidadão aponta a câmera e avalia em segundos.",
  ),
  step(
    "/pontos",
    "qr-share",
    "Leve a avaliação além do balcão",
    "Copie o link para enviar por WhatsApp ou e-mail, ou baixe o QR em imagem.",
  ),
];

// Spec §6 — guia de cada página. Passos cujo alvo não está na tela são pulados no guia de página.
export const PAGE_GUIDES: Record<string, readonly GuideStep[]> = {
  "/dashboard": [
    TOUR_STEPS[1]!,
    TOUR_STEPS[2]!,
    TOUR_STEPS[3]!,
    step(
      "/dashboard",
      "dashboard-recent",
      "O que chegou agora",
      'As avaliações mais recentes, com nota e comentário. "Ver todas" leva para a lista completa.',
    ),
    step(
      "/dashboard",
      "dashboard-refresh",
      "Números sempre em dia",
      "Os indicadores se atualizam sozinhos; use este botão para buscar as avaliações que acabaram de chegar.",
    ),
  ],
  "/qualidade": [
    TOUR_STEPS[4]!,
    step(
      "/qualidade",
      "quality-filters",
      "Mesmo recorte do Painel",
      'Período e filtros funcionam como no Painel; "Limpar filtros" volta ao padrão.',
    ),
    step(
      "/qualidade",
      null,
      "Metodologia transparente",
      "Na aba Metodologia você vê como cada indicador é calculado, para explicar os números com segurança.",
    ),
  ],
  "/avaliacoes": [
    TOUR_STEPS[6]!,
    TOUR_STEPS[5]!,
    step(
      "/avaliacoes",
      null,
      "Do comentário à ação",
      'No detalhe de uma avaliação, "Criar ocorrência" abre o registro já ligado a ela. Dados de contato aparecem só para administradores.',
    ),
  ],
  "/relatorios": [
    TOUR_STEPS[7]!,
    step(
      "/relatorios",
      "report-filters",
      "Filtros na hora",
      "Ao trocar período, ponto ou pesquisa, o relatório se atualiza na hora — e o cabeçalho mostra os filtros aplicados.",
    ),
    step(
      "/relatorios",
      "report-actions",
      "Imprimir ou exportar",
      '"Imprimir" gera o documento no papel (ou PDF); "Exportar CSV" baixa as avaliações em planilha.',
    ),
    step(
      "/relatorios",
      null,
      "Dica",
      "Os relatórios usam os mesmos dados do Painel; o que muda é o formato, pensado para registro e reunião.",
    ),
  ],
  "/visao-executiva": [
    TOUR_STEPS[8]!,
    step(
      "/visao-executiva",
      "report-filters",
      "Escolha o período",
      "O resumo acompanha o período e os filtros escolhidos aqui.",
    ),
    step(
      "/visao-executiva",
      "report-actions",
      "Pronto para a reunião",
      'Use "Imprimir" para levar a visão executiva em papel ou PDF.',
    ),
  ],
  "/ocorrencias": [
    TOUR_STEPS[9]!,
    step(
      "/ocorrencias",
      "occurrences-filters",
      "Foque no que importa",
      'Filtre por status, prioridade, categoria ou responsável e clique em "Aplicar".',
    ),
    TOUR_STEPS[10]!,
    step(
      "/ocorrencias",
      null,
      "Tratar e evoluir",
      'No detalhe, "Editar e tratar" muda status e registra o tratamento; "Criar plano de melhoria" leva o problema adiante.',
    ),
  ],
  "/planos-melhoria": [
    TOUR_STEPS[11]!,
    step(
      "/planos-melhoria",
      "plans-filters",
      "Acompanhe os prazos",
      "Filtre por status, prioridade ou dimensão para ver o que está atrasado.",
    ),
    TOUR_STEPS[12]!,
  ],
  "/pesquisas": [
    TOUR_STEPS[13]!,
    TOUR_STEPS[14]!,
    step(
      "/pesquisas",
      "surveys-essential",
      "Perguntas essenciais",
      "O cadeado indica as seis perguntas que alimentam os indicadores. Você pode mudar o texto; tipo e dimensão ficam fixos.",
    ),
    step(
      "/pesquisas",
      "surveys-add-question",
      "Suas próprias perguntas",
      "Acrescente perguntas para o que for importante no seu cartório — elas aparecem depois das essenciais.",
    ),
    step(
      "/pesquisas",
      "surveys-preview",
      "Prévia",
      'Veja a avaliação como o cidadão vê, inclusive a pergunta "Qual serviço você utilizou hoje?".',
    ),
  ],
  "/pontos": [
    TOUR_STEPS[15]!,
    TOUR_STEPS[16]!,
    step(
      "/pontos",
      "qr-print",
      "Cartaz pronto",
      'Abra o QR e use "Imprimir cartaz": sai com a razão social do cartório em destaque.',
    ),
  ],
  "/cartorio": [
    step(
      "/cartorio",
      "registry-data",
      "Dados do cartório",
      "Razão social, nome fantasia, CNPJ e contato. A razão social aparece no cartaz e na avaliação.",
    ),
    step(
      "/cartorio",
      "registry-attributions",
      "Atribuições da serventia",
      'Marque as atribuições do cartório (Notas, Registro Civil…). Elas montam a pergunta "Qual serviço você utilizou hoje?".',
    ),
    step(
      "/cartorio",
      "registry-services",
      "Serviços oferecidos",
      "Desligue os serviços que o cartório não oferece; eles somem da avaliação, mas o histórico continua.",
    ),
  ],
  "/usuarios": [
    step(
      "/usuarios",
      "users-new",
      "Convide sua equipe",
      "Cadastre nome e e-mail: a pessoa recebe um convite para criar a senha.",
    ),
    step(
      "/usuarios",
      "users-list",
      "Perfis de acesso",
      "Administrador configura tudo; Gestor acompanha e age; Operador consulta e trata ocorrências.",
    ),
    step(
      "/usuarios",
      null,
      "Acesso seguro",
      "Cada pessoa vê apenas os dados do seu cartório, e o menu mostra só o que o perfil permite.",
    ),
  ],
  "/configuracoes": [
    step(
      "/configuracoes",
      "settings-form",
      "Ajustes da avaliação",
      "Mensagem de agradecimento, pedido de contato opcional e outras preferências da avaliação pública.",
    ),
    step(
      "/configuracoes",
      "settings-save",
      "Salve as mudanças",
      "As alterações valem para as próximas avaliações assim que você salvar.",
    ),
    step(
      "/configuracoes",
      null,
      "Privacidade em primeiro lugar",
      "O contato do cidadão é sempre opcional e fica separado da avaliação.",
    ),
  ],
  "/solicitacoes-privacidade": [
    step(
      "/solicitacoes-privacidade",
      "privacy-new",
      "Pedidos de titulares",
      "Registre pedidos de acesso, correção ou eliminação de dados feitos por cidadãos (LGPD).",
    ),
    step(
      "/solicitacoes-privacidade",
      "privacy-list",
      "Acompanhe os prazos",
      "Cada solicitação tem situação e histórico até ser concluída.",
    ),
    step(
      "/solicitacoes-privacidade",
      null,
      "Minimização de dados",
      "Quando cabível, você pode remover o contato e o texto livre de uma avaliação, sem perder os indicadores.",
    ),
  ],
  "/auditoria": [
    step(
      "/auditoria",
      "audit-filters",
      "Encontre uma ação",
      "Filtre por entidade, ação e período.",
    ),
    step(
      "/auditoria",
      "audit-list",
      "Histórico imutável",
      "Toda alteração administrativa fica registrada com data e responsável e não pode ser apagada.",
    ),
    step(
      "/auditoria",
      null,
      "Transparência",
      'Use a auditoria para responder "quem mudou o quê e quando" com segurança.',
    ),
  ],
  "/plataforma": [
    step(
      "/plataforma",
      "platform-summary",
      "Visão geral",
      "Os totais de todos os cartórios: ativos, avaliações da semana, ocorrências abertas e alertas.",
    ),
    step(
      "/plataforma",
      "platform-list",
      "Um cartório por linha",
      "Veja avaliações, nota média, ocorrências abertas, usuários e o último acesso de cada cartório.",
    ),
    step(
      "/plataforma",
      null,
      "Alertas",
      "Um cartório ativo sem avaliações há mais de 7 dias aparece em vermelho: confira se o QR Code está no lugar.",
    ),
  ],
  "/implantacoes": [
    step(
      "/implantacoes",
      "onboarding-new",
      "Novo cartório",
      "Cadastre um cartório com dados e atribuições para começar a implantação.",
    ),
    step(
      "/implantacoes",
      "onboarding-list",
      "Implantações em andamento",
      "Cada cartório passa por 8 etapas: dados, administrador, pesquisa, perguntas, ponto, QR Code, teste e ativação.",
    ),
    step(
      "/implantacoes",
      null,
      "Ativação segura",
      "O cartório só é ativado depois do checklist completo e de uma avaliação de teste, que não entra nos indicadores.",
    ),
  ],
};
