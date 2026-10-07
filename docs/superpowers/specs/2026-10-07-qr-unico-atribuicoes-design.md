# QR Code único, atribuições da serventia e perguntas essenciais

- **Data:** 2026-10-07
- **Status:** aguardando revisão
- **Princípio:** sistema prático e de fácil uso; só o essencial neste primeiro momento.

## 1. Objetivo

Hoje o CartoQuali permite vários pontos de avaliação (um QR Code por setor), e a página inicial vende essa ideia. Na prática, o cidadão não vai avaliar cada setor separadamente. Esta mudança:

1. Passa a ter **um único QR Code por cartório**.
2. Pergunta, de forma **opcional**, qual serviço o cidadão utilizou, para os resultados poderem ser lidos por serviço.
3. Monta a lista de serviços a partir das **atribuições da serventia** (Lei 8.935/1994, art. 5º).
4. Garante que todo cartório tenha as **6 perguntas essenciais**, ligadas à Lei 13.460/2017 e ao PQTA, protegidas contra remoção; o responsável pode ajustar o texto e criar perguntas extras.

### Critérios de sucesso

- Um cartório novo marca suas atribuições e já tem a pergunta de serviço e as 6 essenciais, sem configurar mais nada.
- O cidadão avalia em cerca de 1 minuto, pelo celular, com um único QR Code.
- O gestor vê os indicadores filtrados e agrupados por serviço no painel.
- Nenhuma avaliação, link ou QR Code já existente deixa de funcionar.

## 2. Referências normativas

| Fonte | O que usamos |
|---|---|
| Lei 8.935/1994, art. 5º | As 7 especialidades que formam as atribuições |
| Lei 13.460/2017, art. 1º §3º | Aplicação subsidiária aos serviços públicos prestados por particular |
| Lei 13.460/2017, art. 23 | Avaliação continuada: satisfação (I), qualidade do atendimento (II), prazos (III), manifestações (IV), melhorias (V); pesquisa ao menos anual (§1º) |
| Lei 13.460/2017, art. 5º | Cortesia (I), prazos (VI), instalações acessíveis e sinalizadas (X), linguagem simples (XIV) |
| PQTA/ANOREG-BR | Avaliação da satisfação dos usuários entre os critérios; blocos Instalações e Gestão Operacional |
| CNJ, Provimento 229/2026 | Direção: melhoria contínua da experiência do usuário, linguagem simples, indicadores por serventia |

O texto comercial **não** afirma conformidade legal; cita as normas como motivação, com o aviso de independência mantido.

## 3. Decisões tomadas

| Tema | Decisão |
|---|---|
| Serviço utilizado | QR único + pergunta **opcional** de serviço (opção B) |
| Personalização | Essenciais protegidas (só o texto é editável); extras livres (opção A) |
| Implementação | Evoluir o modelo atual, sem eliminar "pontos" (abordagem 1) |
| Razão social | Aparece no **cartaz** e na **página de avaliação**; o link continua com código curto (opção A) |

## 4. Fora do escopo (agora)

- Acrescentar ou renomear serviços próprios (só ligar/desligar os sugeridos).
- Reordenar perguntas e "restaurar texto padrão".
- Perguntas diferentes por atribuição.
- Filtro por serviço em Avaliações e Relatórios; seção "Por serviço" no relatório; serviço nas ocorrências.
- Seção "Links anteriores" na tela de QR Code.
- Relatório anual pronto para publicação (Lei 13.460, art. 23, §2º).
- Autenticação em dois fatores (Provimento 213/2026), tratada separadamente.

## 5. Atribuições e catálogo de serviços

Chaves das atribuições e serviços sugeridos (o catálogo é global e somente leitura):

| Chave | Atribuição | Serviços sugeridos |
|---|---|---|
| `notas` | Tabelionato de Notas | Reconhecimento de firma; Autenticação de cópias; Escritura; Procuração; Testamento; Ata notarial; Inventário ou divórcio em cartório |
| `protesto` | Tabelionato de Protesto | Protesto de título; Cancelamento de protesto; Certidão de protesto |
| `imoveis` | Registro de Imóveis | Registro ou averbação; Certidão de matrícula; Usucapião extrajudicial |
| `rtd_pj` | Registro de Títulos e Documentos e Civil de Pessoas Jurídicas | Registro de documentos; Registro de pessoa jurídica; Notificação |
| `civil_pn` | Registro Civil das Pessoas Naturais | Nascimento; Casamento; Óbito; Certidões; Habilitação de casamento |
| `maritimo` | Registro de Contratos Marítimos | Registro de contrato marítimo |
| `distribuicao` | Registro de Distribuição | Distribuição; Certidão de distribuição |

Regras:
- O cartório marca **ao menos uma** atribuição.
- Ao marcar uma atribuição, os serviços do catálogo dela são criados para o cartório, **ativos**. Ao desmarcar, os serviços dela ficam ocultos na avaliação, mas **permanecem no histórico**.
- O responsável pode **ligar/desligar** cada serviço.
- A avaliação pública sempre oferece também "Outro serviço" e "Pular" (gravados como `servico_id` nulo + marcação "outro", ou nulo quando pulado).

## 6. Modelo de dados (migrações aditivas)

Nenhuma coluna ou tabela existente é removida; nenhuma avaliação é alterada.

1. **`cartorios.atribuicoes text[] not null default '{}'`**, com check de que cada valor pertence às 7 chaves.
2. **`catalogo_servicos`** (global): `chave text pk`, `atribuicao text`, `nome text`, `ordem int`. Leitura para `authenticated` e `service_role`; sem escrita por clientes. Populada pela migração com a tabela da seção 5.
3. **`servicos_cartorio`**: `id uuid pk`, `cartorio_id uuid fk`, `catalogo_chave text fk`, `atribuicao text`, `nome text`, `ativo bool default true`, `ordem int`, `created_at`, `updated_at`; único em `(cartorio_id, catalogo_chave)`. RLS: leitura do próprio cartório; escrita só via RPC.
4. **`avaliacoes.servico_id uuid null fk servicos_cartorio`** e **`avaliacoes.servico_outro bool not null default false`**. Índice em `(cartorio_id, servico_id, created_at)` com `where not is_test`.
5. **`perguntas.chave_essencial text null`**, com valores `overall`, `courtesy`, `clarity`, `time`, `structure`, `resolution`; único em `(pesquisa_id, chave_essencial)`.

### Proteções no banco

- **Trigger em `perguntas`** (antes de update/delete):
  - se `old.chave_essencial` não é nulo: bloqueia delete e qualquer mudança em `tipo`, `dimensao`, `obrigatoria`, `ativa`, `pesquisa_id`, `chave_essencial` (erro `essential_question_locked`); `texto` pode mudar;
  - em insert/update por cliente (`auth.role() <> 'service_role'`): `chave_essencial` deve permanecer nulo.
- **Trigger em `pesquisas`** (após insert): cria as 6 essenciais e as 2 extras do modelo padrão (seção 7). Assim, toda pesquisa nova já nasce completa, inclusive as do onboarding, e `save_onboarding_survey` deixa de inserir perguntas por conta própria. Pesquisas que já existem recebem só as essenciais (ver "Migração de dados existentes").
- **RPC `set_registry_attributions(_atribuicoes text[])`**: exige PLATFORM_ADMIN ou CARTORIO_ADMIN, deriva o cartório da sessão, valida ao menos uma atribuição, grava, cria os serviços faltantes do catálogo e registra auditoria.
- **RPC `set_registry_service_active(_servico_id uuid, _ativo bool)`**: mesmos requisitos; só serviços do próprio cartório; auditoria.

### Migração de dados existentes

- Em cada pesquisa existente, marca como essencial a primeira pergunta ativa de cada dimensão correspondente (`overall`→overall, `service`→courtesy, `clarity`→clarity, `time`→time, `structure`→structure, `resolution`→resolution) e cria as essenciais que faltarem, com texto padrão, no fim da ordem atual, ajustando a ordem para essenciais 1–6 e extras depois.
- Cartórios existentes ficam com `atribuicoes = '{}'`; a tela Cartório e o painel pedem para preenchê-las. Enquanto vazias, a avaliação pública não mostra a pergunta de serviço.

## 7. Perguntas essenciais (texto padrão)

| Ordem | Chave | Texto padrão | Tipo | Dimensão | Obrigatória |
|---|---|---|---|---|---|
| 1 | overall | Como você avalia sua experiência geral hoje? | estrelas 1–5 | overall | sim |
| 2 | courtesy | Como você avalia a cordialidade e o respeito no atendimento? | escala 1–5 | service | sim |
| 3 | clarity | As informações foram claras e fáceis de entender? | escala 1–5 | clarity | sim |
| 4 | time | Como você avalia o tempo de espera e o cumprimento dos prazos informados? | escala 1–5 | time | sim |
| 5 | structure | Como você avalia as instalações (conforto, limpeza, sinalização e acessibilidade)? | escala 1–5 | structure | não |
| 6 | resolution | Seu atendimento foi resolvido? | Sim / Parcialmente / Não | resolution | sim |

Perguntas extras (não essenciais) continuam com edição completa e aparecem depois das essenciais. O modelo padrão inclui duas extras: "O que poderia melhorar?" (múltipla escolha, só se a nota geral for 1–3) e "Deixe um comentário" (texto, opcional).

## 8. Avaliação pública

Fluxo: boas-vindas → serviço (opcional) → 6 essenciais → extras → comentário/contato (opcionais) → agradecimento.

- **Cabeçalho:** razão social em destaque, nome fantasia abaixo quando houver, e "Avaliação do atendimento". O nome do ponto deixa de aparecer.
- **Serviço:** botões grandes com os serviços ativos das atribuições marcadas, agrupados por atribuição quando houver mais de uma, mais "Outro serviço" e "Pular". Não aparece se houver 0 ou 1 serviço ativo (com 1, ele é gravado automaticamente).
- **`get_public_evaluation_context`** passa a devolver `registryOfficialName`, `registryTradeName` e `services: [{id, name, attribution}]`.
- **`submit_public_evaluation`** ganha `_servico_id uuid default null` e `_servico_outro bool default false`; valida que o serviço é do mesmo cartório, está ativo e pertence a uma atribuição marcada (erro `service_unavailable`); grava nas novas colunas. O resto (idempotência, limite por sessão, contato separado) não muda.
- `submissionSchema` no servidor aceita `serviceId?: uuid` e `serviceOther?: boolean`.

## 9. Telas de configuração

- **Cartório → "Atribuições e serviços"** (edição: administradores; demais leem): caixas das 7 atribuições; serviços agrupados com interruptor; aviso ao desmarcar atribuição.
- **Pesquisas:** essenciais com cadeado e etiqueta "Essencial · {indicador}"; no editor de uma essencial, só o texto fica editável, com a explicação; prévia mostra a tela de serviço.
- **"Pontos de avaliação" → "QR Code"** (menu "Coletar"): mostra o QR do cartório (o ponto ativo único; se houver mais de um ativo, o mais antigo), link, baixar, imprimir e cartaz com a razão social. Sai "Novo ponto". Pontos já existentes continuam acessíveis pelo link.
- **Implantação:** a etapa de dados do cartório pede as atribuições (`create_cartorio_onboarding` aceita `_atribuicoes`); a pesquisa modelo nasce com as essenciais pelo trigger; o QR único continua automático.

## 10. Painel e listas

- **`get_dashboard_indicators`** ganha `_servico_id uuid default null` (filtro) e devolve `services: [{id, name, total, average, negative_rate}]`, com dois itens especiais: "Outro serviço" (`servico_outro = true`) e "Serviço não informado" (`servico_id` nulo e `servico_outro = false`). O bloco `points` continua na resposta por compatibilidade.
- **Painel:** filtro "Todos os serviços" no lugar de "Todos os pontos"; "Desempenho por serviço" no lugar de "Desempenho por ponto".
- **Qualidade:** a dimensão `service` passa a ser rotulada "Cordialidade".
- **Avaliações:** coluna "Serviço" na lista e no detalhe.
- **CSV do relatório:** coluna "Serviço".

## 11. Página inicial

- **Indicadores:** sai "Exemplos de pontos de atendimento"; entra "Um QR Code para todo o cartório. O cidadão avalia em um só lugar e informa, se quiser, o serviço que utilizou. Você acompanha os resultados por serviço, conforme as atribuições da sua serventia."
- **Feito para cartórios:** acrescenta "A Lei nº 13.460/2017, aplicável de forma subsidiária aos serviços públicos prestados por particulares, prevê a avaliação continuada da satisfação dos usuários, com pesquisa ao menos anual." O trecho do PQTA e o aviso de independência permanecem.

## 12. Dados do DEMO (script aprovado à parte, não migração)

- Atribuições: `notas` e `civil_pn`.
- Manter ativo apenas `CQ-BAL-001`; desativar `CQ-REC-001` e `CQ-SAI-001` (links continuam respondendo como ponto inativo).

## 13. Testes

- **Unitários (Vitest):** montagem da lista de serviços a partir das atribuições e do catálogo (função pura); `submissionSchema` com `serviceId`; regra de exibição da tela de serviço (0, 1 ou vários serviços); mapeamento chave essencial → indicador.
- **SQL (`database/tests/`):** trigger bloqueia remoção/desativação/mudança de tipo de essencial e permite mudar o texto; cliente não consegue criar `chave_essencial`; `submit_public_evaluation` rejeita serviço de outro cartório ou inativo; `set_registry_attributions` exige administrador.
- **Manual no navegador:** fluxo público no celular (com e sem serviço), configuração de atribuições, painel filtrado por serviço, cartaz com razão social.

## 14. Ordem de entrega (PRs)

1. Banco: colunas, catálogo, serviços, triggers, RPCs, migração das pesquisas existentes, atualização de `get_public_evaluation_context`, `submit_public_evaluation` e `get_dashboard_indicators` (tudo compatível com o front atual).
2. Configuração: atribuições e serviços na tela Cartório; essenciais com cadeado em Pesquisas; tela QR Code; onboarding.
3. Avaliação pública: cabeçalho com razão social e tela de serviço.
4. Painel, lista de avaliações e CSV.
5. Página inicial.

Cada PR passa pela CI; as migrações são aplicadas pela integração Supabase ↔ GitHub no merge.

## 15. Riscos

- **Cartórios sem atribuições** após a migração: mitigado por aviso no painel e na tela Cartório; a avaliação funciona sem a pergunta de serviço.
- **Texto de essenciais personalizado em pesquisas antigas**: a migração reaproveita a pergunta existente da mesma dimensão, preservando o texto do cartório.
- **Mais uma tela no fluxo público**: é opcional, tem "Pular" e some quando há 0 ou 1 serviço.
