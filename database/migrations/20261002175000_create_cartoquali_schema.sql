begin;

create extension if not exists pgcrypto;

create table public.cartorios (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique,
  tipo text not null,
  telefone text,
  email text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text not null,
  estado text not null check (char_length(estado) = 2),
  responsavel text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  plano text not null,
  data_renovacao date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on public.cartorios from anon, authenticated;
grant all on public.cartorios to service_role;

create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cartorio_id, email),
  unique (id, cartorio_id)
);
revoke all on public.usuarios from anon, authenticated;
grant all on public.usuarios to service_role;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  role text not null check (role in ('PLATFORM_ADMIN', 'CARTORIO_ADMIN', 'GESTOR', 'OPERADOR')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
revoke all on public.user_roles from anon, authenticated;
grant all on public.user_roles to service_role;

create table public.pesquisas (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  nome text not null,
  descricao text,
  status text not null default 'rascunho' check (status in ('ativa', 'rascunho', 'inativa')),
  versao text not null default '1.0',
  configuracoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, cartorio_id)
);
revoke all on public.pesquisas from anon, authenticated;
grant all on public.pesquisas to service_role;

create table public.pontos_avaliacao (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  pesquisa_id uuid not null,
  nome text not null,
  localizacao text not null,
  codigo text not null,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  public_slug text not null,
  metodo text not null default 'link_publico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cartorio_id, codigo),
  unique (cartorio_id, public_slug),
  unique (id, cartorio_id, pesquisa_id),
  foreign key (pesquisa_id, cartorio_id)
    references public.pesquisas(id, cartorio_id) on delete restrict
);
revoke all on public.pontos_avaliacao from anon, authenticated;
grant all on public.pontos_avaliacao to service_role;

create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas(id) on delete cascade,
  texto text not null,
  tipo text not null check (tipo in ('stars', 'yes_no', 'scale', 'single_choice', 'multiple_choice', 'text')),
  ordem integer not null check (ordem > 0),
  obrigatoria boolean not null default false,
  ativa boolean not null default true,
  dimensao text not null check (dimensao in ('overall', 'service', 'resolution', 'time', 'clarity', 'structure', 'comment', 'contact')),
  condicao jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pesquisa_id, ordem)
);
revoke all on public.perguntas from anon, authenticated;
grant all on public.perguntas to service_role;

create table public.opcoes_resposta (
  id uuid primary key default gen_random_uuid(),
  pergunta_id uuid not null references public.perguntas(id) on delete cascade,
  texto text not null,
  valor text not null,
  ordem integer not null check (ordem > 0),
  created_at timestamptz not null default now(),
  unique (pergunta_id, ordem)
);
revoke all on public.opcoes_resposta from anon, authenticated;
grant all on public.opcoes_resposta to service_role;

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  ponto_id uuid not null,
  pesquisa_id uuid not null,
  nota_geral smallint not null check (nota_geral between 1 and 5),
  atendimento_resolvido text check (atendimento_resolvido in ('sim', 'parcialmente', 'nao')),
  comentario text,
  motivo_insatisfacao text,
  deseja_contato boolean not null default false,
  nome_contato text,
  telefone_contato text,
  email_contato text,
  anonymous boolean not null default true,
  status text not null default 'nova' check (status in ('nova', 'em_analise', 'respondida')),
  created_at timestamptz not null default now(),
  unique (id, cartorio_id),
  foreign key (ponto_id, cartorio_id, pesquisa_id)
    references public.pontos_avaliacao(id, cartorio_id, pesquisa_id) on delete restrict,
  check (deseja_contato or (nome_contato is null and telefone_contato is null and email_contato is null)),
  check (not deseja_contato or not anonymous)
);
revoke all on public.avaliacoes from anon, authenticated;
grant all on public.avaliacoes to service_role;

create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  pergunta_id uuid not null references public.perguntas(id) on delete restrict,
  valor jsonb,
  resposta_texto text,
  created_at timestamptz not null default now(),
  unique (avaliacao_id, pergunta_id),
  check (valor is not null or resposta_texto is not null)
);
revoke all on public.respostas from anon, authenticated;
grant all on public.respostas to service_role;

create table public.ocorrencias_qualidade (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  avaliacao_id uuid,
  ponto_id uuid,
  titulo text not null,
  categoria text not null check (categoria in ('atendimento', 'tempo', 'clareza', 'resolutividade', 'estrutura', 'processo', 'outro')),
  descricao text not null,
  prioridade text not null check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  responsavel_id uuid,
  status text not null default 'nova' check (status in ('nova', 'em_analise', 'em_tratamento', 'resolvida', 'encerrada')),
  origem text not null,
  prazo date,
  data_abertura timestamptz not null default now(),
  data_resolucao timestamptz,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, cartorio_id),
  foreign key (avaliacao_id, cartorio_id)
    references public.avaliacoes(id, cartorio_id) on delete restrict,
  foreign key (responsavel_id, cartorio_id)
    references public.usuarios(id, cartorio_id) on delete restrict,
  foreign key (ponto_id, cartorio_id)
    references public.pontos_avaliacao(id, cartorio_id) on delete restrict,
  check (data_resolucao is null or data_resolucao >= data_abertura)
);
revoke all on public.ocorrencias_qualidade from anon, authenticated;
grant all on public.ocorrencias_qualidade to service_role;

create table public.planos_melhoria (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  ocorrencia_id uuid not null,
  ponto_id uuid,
  dimensao text check (dimensao in ('general', 'service', 'resolution', 'time', 'clarity', 'structure')),
  titulo text not null,
  problema text not null,
  objetivo text not null,
  acao text not null,
  responsavel_id uuid,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  prazo date not null,
  status text not null default 'planejado' check (status in ('planejado', 'em_andamento', 'atrasado', 'concluido', 'cancelado')),
  progresso smallint not null default 0 check (progresso in (0, 25, 50, 75, 100)),
  resultado_esperado text,
  resultado text,
  observacao_resultado text,
  indicador_nome text,
  indicador_antes numeric(7,2),
  indicador_depois numeric(7,2),
  concluido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (ocorrencia_id, cartorio_id)
    references public.ocorrencias_qualidade(id, cartorio_id) on delete restrict,
  foreign key (responsavel_id, cartorio_id)
    references public.usuarios(id, cartorio_id) on delete restrict,
  foreign key (ponto_id, cartorio_id)
    references public.pontos_avaliacao(id, cartorio_id) on delete restrict,
  check (indicador_antes is null or indicador_antes between 0 and 100),
  check (indicador_depois is null or indicador_depois between 0 and 100)
);
revoke all on public.planos_melhoria from anon, authenticated;
grant all on public.planos_melhoria to service_role;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  cartorio_id uuid not null references public.cartorios(id) on delete restrict,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (user_id, cartorio_id)
    references public.usuarios(id, cartorio_id) on delete restrict
);
revoke all on public.audit_logs from anon, authenticated;
grant all on public.audit_logs to service_role;

create index usuarios_cartorio_id_idx on public.usuarios (cartorio_id);
create index usuarios_status_idx on public.usuarios (status);
create index pesquisas_cartorio_status_idx on public.pesquisas (cartorio_id, status);
create index pontos_cartorio_status_idx on public.pontos_avaliacao (cartorio_id, status);
create index pontos_pesquisa_id_idx on public.pontos_avaliacao (pesquisa_id);
create index perguntas_pesquisa_id_idx on public.perguntas (pesquisa_id);
create index opcoes_pergunta_id_idx on public.opcoes_resposta (pergunta_id);
create index avaliacoes_cartorio_created_at_idx on public.avaliacoes (cartorio_id, created_at desc);
create index avaliacoes_ponto_id_idx on public.avaliacoes (ponto_id);
create index avaliacoes_pesquisa_id_idx on public.avaliacoes (pesquisa_id);
create index avaliacoes_status_idx on public.avaliacoes (status);
create index respostas_avaliacao_id_idx on public.respostas (avaliacao_id);
create index respostas_pergunta_id_idx on public.respostas (pergunta_id);
create index ocorrencias_cartorio_status_idx on public.ocorrencias_qualidade (cartorio_id, status);
create index ocorrencias_avaliacao_id_idx on public.ocorrencias_qualidade (avaliacao_id);
create index ocorrencias_ponto_id_idx on public.ocorrencias_qualidade (ponto_id);
create index ocorrencias_responsavel_id_idx on public.ocorrencias_qualidade (responsavel_id);
create index planos_cartorio_status_idx on public.planos_melhoria (cartorio_id, status);
create index planos_ocorrencia_id_idx on public.planos_melhoria (ocorrencia_id);
create index planos_ponto_id_idx on public.planos_melhoria (ponto_id);
create index planos_responsavel_id_idx on public.planos_melhoria (responsavel_id);
create index audit_logs_cartorio_created_at_idx on public.audit_logs (cartorio_id, created_at desc);
create index audit_logs_user_id_idx on public.audit_logs (user_id);

commit;
