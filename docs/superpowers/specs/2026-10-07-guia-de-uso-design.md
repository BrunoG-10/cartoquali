# Guia de uso (tour guiado) — Especificação

**Data:** 07/10/2026 · **Status:** em revisão

## 1. Objetivo

Ensinar o usuário a usar o CartoQuali de forma lúdica e imersiva, sobre as telas reais:

- **Tour completo** obrigatório no primeiro login (pode ser adiado, volta até ser concluído).
- **Guia por página** em todas as telas do sistema.
- **Botão "?"** no topo para rever qualquer um dos dois a qualquer momento.

## 2. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Telas do tour completo | Grupos **Acompanhar, Agir e Coletar** (9 telas), filtradas pelo perfil |
| Formato | Abertura animada + tour com destaque na tela real + tela final |
| Obrigatoriedade | "Continuar depois" fecha; reabre no próximo login, de onde parou, até concluir |
| Botão "?" | Menu com "Guia desta página" e "Tour completo do sistema" |
| Motor do destaque | Biblioteca `driver.js` (≈5 KB, MIT), com visual da marca |
| Onde guardar o progresso | Banco, por usuário (vale em qualquer dispositivo) |
| Usuários existentes | Também veem o tour no próximo login (nenhum concluiu ainda) |

## 3. Experiência

### 3.1 Abertura (tela cheia)

- Fundo azul-marinho com a cena animada do login (QR → avaliação → indicador), reaproveitada de `auth-scene.tsx`.
- Título: **"Olá, {primeiro nome}! Boas-vindas ao CartoQuali."**
- Texto: "Em cerca de 3 minutos você vai conhecer as telas que usará no dia a dia: como acompanhar a satisfação, agir sobre problemas e coletar avaliações."
- Botões: **"Começar o tour"** (principal) e **"Continuar depois"**.
- Quando o tour é retomado: título "Bem-vindo de volta, {nome}!" e botão **"Continuar de onde parei"** (com "Recomeçar do início" como link).

### 3.2 Durante o tour

- A tela real fica escurecida, com só o bloco explicado aceso.
- Balão com: **etiqueta da etapa** ("Etapa 3 de 9 · Avaliações"), **título curto**, **texto** em linguagem simples, **barra de progresso** dourada e botões **Voltar / Próximo / Continuar depois**.
- Ao passar para outra tela, o sistema navega sozinho e espera a tela carregar antes de acender o próximo bloco. O item do menu lateral daquela tela fica destacado.
- Teclado: setas avançam/voltam; `Esc` = "Continuar depois".
- No celular: o balão vira um cartão fixo na parte de baixo da tela; o menu lateral não é aberto (o tour cita o menu "☰").

### 3.3 Final

- Janela "**Tudo pronto!**" com as telas visitadas marcadas (✓), um selo dourado animado ("Tour concluído") e o texto: "Sempre que precisar, clique no **?** no topo da tela para rever o guia da página ou este tour."
- Botão **"Começar a usar"** → volta ao Painel.

### 3.4 Botão "?"

- **Computador:** nova barra fina no topo da área de conteúdo com o nome da tela à esquerda e o "?" à direita.
- **Celular:** o "?" entra na barra superior existente, ao lado do ícone de avaliação pública.
- Menu: **"Guia desta página"** (desabilitado se a tela não tiver guia) e **"Tour completo do sistema"**.
- O guia de página não altera o progresso do tour completo.

## 4. Regras

- O tour completo abre automaticamente quando o usuário entra logado e **não concluiu** o tour (`concluido_em` vazio), em qualquer tela da área logada.
- "Continuar depois" grava a etapa atual; no próximo login a abertura oferece continuar dali.
- Etapas cuja tela o perfil não vê (`can(role, módulo)`) são puladas; se um bloco não existir na tela (ex.: lista vazia), o balão aparece centralizado, sem destaque, em vez de quebrar.
- Concluir o tour (chegar à tela final) grava `concluido_em`. Rever pelo "?" depois disso não altera nada.
- O tour não executa ações: não salva, não envia e não apaga nada; só navega e destaca.

## 5. Conteúdo do tour completo

Cada linha é um balão. "Alvo" é o bloco destacado (marcado no código com `data-tour`).

**Acompanhar**

1. **Painel** · alvo: menu "Acompanhar" — "**Seu ponto de partida.** O Painel mostra, num só lugar, como está a satisfação de quem foi atendido."
2. **Painel** · alvo: cartões de indicadores — "**Os números que importam.** Satisfação geral, nota média, avaliações negativas e resolutividade, comparados com o período anterior."
3. **Painel** · alvo: filtros de período e serviço — "**Escolha o recorte.** Troque o período ou veja só um serviço, como Escritura ou Certidões."
4. **Painel** · alvo: "Desempenho por serviço" — "**Onde está bom e onde melhorar.** Cada serviço com sua nota média e o percentual de avaliações negativas."
5. **Qualidade** · alvo: abas de análise — "**Olhar de especialista.** Aqui os indicadores se abrem por dimensão (cordialidade, clareza, tempo, instalações e resolução) e mostram a evolução no tempo."
6. **Avaliações** · alvo: lista de avaliações — "**Cada opinião, uma a uma.** Veja nota, serviço e comentário de cada avaliação. Clique numa delas para ver todas as respostas."
7. **Avaliações** · alvo: filtros — "**Encontre o que precisa.** Busque por comentário ou filtre por nota, classificação e status."
8. **Relatórios** · alvo: catálogo de relatórios — "**Documentos prontos.** Relatórios de qualidade, satisfação, ocorrências e melhorias para imprimir ou exportar em planilha (CSV)."
9. **Visão executiva** · alvo: resumo executivo — "**Para quem decide.** Um resumo de uma página com os principais números e pontos de atenção, pronto para reunião."

**Agir**

10. **Ocorrências** · alvo: botão "Nova ocorrência" — "**Problema identificado vira tarefa.** Registre uma ocorrência com responsável, prioridade e prazo. Dá para criar direto de uma avaliação negativa."
11. **Ocorrências** · alvo: lista — "**Acompanhe até resolver.** Cada ocorrência passa por Nova → Em análise → Em tratamento → Resolvida, com histórico."
12. **Planos de melhoria** · alvo: botão "Novo plano" — "**Da correção à melhoria.** Quando um problema se repete, crie um plano com objetivo, ação, responsável e prazo."
13. **Planos de melhoria** · alvo: lista — "**Mostre o resultado.** Ao concluir, registre o antes e o depois do indicador para provar que a ação funcionou."

**Coletar**

14. **Pesquisas** · alvo: cartão da pesquisa — "**As perguntas da avaliação.** Seis perguntas essenciais (com cadeado) garantem indicadores comparáveis; você pode ajustar o texto delas e acrescentar perguntas próprias."
15. **Pesquisas** · alvo: botão "Prévia" — "**Veja como o cidadão vê.** A prévia mostra a avaliação exatamente como aparece no celular, sem registrar respostas."
16. **QR Code** · alvo: cartão do QR — "**Um QR Code para todo o cartório.** Imprima o cartaz, cole no balcão e pronto: o cidadão aponta a câmera e avalia em segundos."
17. **QR Code** · alvo: botões Copiar link / Ver QR Code — "**Leve a avaliação além do balcão.** Copie o link para enviar por WhatsApp ou e-mail, ou baixe o QR em imagem."

Total: até 17 balões + abertura + final (menos para perfis que veem menos telas).

## 6. Guias por página

Mesmo formato, 3 a 6 balões, explicando cada bloco e botão. Para as telas do tour completo, o guia da página reaproveita os balões da seção 5 e acrescenta os detalhes abaixo:

| Tela | Balões extras |
|---|---|
| Painel | Botão "Atualizar indicadores"; "Avaliações recentes"; "Distribuição das notas" |
| Qualidade | Cada aba (Indicadores, Dimensões, Evolução, Metodologia); filtros |
| Avaliações | Detalhe da avaliação; botão "Criar ocorrência"; contato restrito |
| Relatórios | Filtros aplicam na hora; "Imprimir"; "Exportar CSV"; linha "Filtros aplicados" |
| Visão executiva | Imprimir para reunião |
| Ocorrências | Filtros; detalhe → "Editar e tratar"; "Criar plano de melhoria" |
| Planos de melhoria | Filtros; detalhe → "Editar plano"; progresso |
| Pesquisas | Pergunta essencial (cadeado); "+ Pergunta"; perguntas condicionais |
| QR Code | "Imprimir cartaz"; "Abrir" para testar |
| Cartório | Dados cadastrais; **Atribuições e serviços** (montam a pergunta de serviço); ligar/desligar serviços |
| Usuários | Perfis (Administrador, Gestor, Operador) e o que cada um faz; convite por e-mail |
| Configurações | Mensagem de agradecimento; contato opcional; retenção de dados |
| Privacidade | Registrar solicitação de titular; prazos; minimização de dados |
| Auditoria | Histórico imutável; filtros por entidade, ação e período |
| Implantações | Fluxo de 8 etapas para cadastrar e ativar um cartório |

Os textos finais desses balões seguem o mesmo tom da seção 5 e ficam no arquivo de conteúdo (seção 7).

## 7. Arquitetura

- **Conteúdo:** `src/lib/guide/content.ts` — roteiro tipado (tela, módulo de permissão, alvo `data-tour`, título, texto). Único lugar com os textos.
- **Lógica pura:** `src/lib/guide/plan.ts` — monta o roteiro para um perfil (filtra por `can`), calcula retomada a partir da etapa salva e o rótulo "Etapa X de Y". Testada com Vitest.
- **Orquestrador:** `src/components/cartoquali/guide/guide-provider.tsx` — contexto React montado no `AppShell`; usa `driver.js` para destacar, navega com o TanStack Router entre telas, espera o alvo aparecer (até 4 s) e trata alvo ausente.
- **Telas de abertura e final:** `guide-welcome.tsx` e `guide-finish.tsx` (reaproveitam a cena do login).
- **Barra superior e "?":** `app-topbar.tsx` no `AppShell` (computador) + botão na barra móvel existente.
- **Marcação dos alvos:** atributos `data-tour="..."` nos componentes das telas (sem mudar comportamento).
- **Estilo:** tema do `driver.js` sobrescrito em `styles.css` com tokens da marca; animações respeitam `prefers-reduced-motion`.

### 7.1 Banco (migração aditiva)

- Tabela `public.guia_progresso` (`usuario_id` PK → `usuarios.id`, `etapa int not null default 0`, `concluido_em timestamptz`, `updated_at timestamptz`).
- RLS: o usuário só **lê** a própria linha; sem escrita direta.
- RPC `public.save_my_guide_progress(_etapa int, _concluido boolean)` — `security definer`, deriva o usuário de `current_user_id()`, faz upsert da própria linha; `_concluido` só preenche `concluido_em` (nunca apaga).
- `getCurrentAuthContext` passa a devolver `guide: { step, completedAt }`.
- Validação com script de dry run (BEGIN … ROLLBACK) antes do merge, como nas outras migrações.

## 8. Testes

- **Vitest:** roteiro por perfil (Operador não recebe Pesquisas/QR Code); retomada pela etapa salva; rótulo de progresso; todo alvo do conteúdo existe como `data-tour` no código (varredura de arquivos, como o teste de RPC).
- **SQL (dry run):** usuário grava só o próprio progresso; `concluido_em` não volta a nulo; outro usuário não lê a linha alheia.
- **Navegador:** primeiro login → abertura → tour inteiro → final; "Continuar depois" e retomada após recarregar; "?" → guia da página e tour completo; computador (1280 px) e celular (375 px); perfil Operador.

## 9. Fora do escopo

- Vídeos, narração em áudio ou mascote ilustrado.
- Estatísticas de uso do tour.
- Tour na avaliação pública (cidadão) e na página inicial comercial.
