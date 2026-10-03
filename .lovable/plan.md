# Etapa 12 — Permissões, Auditoria e Controle Operacional

## Objetivo
Centralizar e aplicar a matriz dos quatro papéis existentes em todas as camadas, impedir escalada de privilégio e acesso entre cartórios, completar a auditoria imutável e oferecer consulta operacional real. Não iniciar etapa posterior nem itens comerciais.

## Diagnóstico confirmado
- A área privada valida login, mas não restringe páginas por papel; o menu também mostra opções sem considerar permissão.
- As regras estão duplicadas em funções e componentes, com diferenças entre módulos.
- Usuários e papéis têm proteção parcial, mas a atualização de perfil e papel não é atômica e não gera histórico completo.
- `audit_logs` é somente leitura para usuários e já recebe eventos de ocorrências, planos e pontos, porém faltam usuários, pesquisas, configurações e uma tela geral.
- Pesquisas/perguntas/opções e Configurações ainda usam estado local, portanto não podem produzir auditoria real.
- O Supabase externo possui apenas CARTORIO_ADMIN, GESTOR e OPERADOR nos dados atuais; PLATFORM_ADMIN exigirá fixture controlada e temporária para teste.
- O acesso autenticado automatizado no navegador não é injetável neste Supabase externo; a validação visual autenticada será executada somente se houver sessão autorizada disponível, sem mascarar a limitação.

## Implementação

### 1. Matriz única de autorização
- Criar um contrato tipado único para `PLATFORM_ADMIN`, `CARTORIO_ADMIN`, `GESTOR` e `OPERADOR`, com capacidades por módulo e ação.
- Reutilizar o contrato no menu, páginas, botões e funções autenticadas; o frontend apenas comunica a permissão, enquanto banco e servidor continuam sendo a autoridade.
- Padronizar respostas de acesso negado, sessão expirada, usuário inativo, papel ausente e cartório inativo.

### 2. Proteção do banco e prevenção de escalada
- Criar helpers privados e seguros para identidade ativa, cartório e verificação de papel, com `search_path` fixo e permissões de execução mínimas.
- Substituir policies excessivamente amplas de Cartório, Usuários, Papéis, Pesquisas, Perguntas, Opções e Pontos por regras explícitas de leitura/escrita por papel e cartório.
- Impedir que o cliente altere `cartorio_id`, conceda `PLATFORM_ADMIN`, altere o próprio papel/status ou remova o último administrador do cartório.
- Manter avaliações/respostas imutáveis e preservar as regras de ocorrências, planos, relatórios e fluxo público já validadas.
- Revisar grants, funções `SECURITY DEFINER`, `search_path`, `EXECUTE`, índices e ausência de chave privilegiada no navegador.

### 3. Administração de usuários e sessão
- Tornar criação/convite, atualização de perfil, papel e status operações autenticadas e atômicas, sempre derivando o cartório da sessão.
- Registrar autor, alvo, antes/depois e resultado relevante sem armazenar tokens ou dados sensíveis.
- Invalidar o contexto operacional imediatamente quando o usuário ficar inativo, perder o papel ou o cartório ficar inativo; impedir novas chamadas com sessão antiga.
- Preservar o uso do cliente privilegiado apenas para administração do Supabase Auth, depois da autorização tenant-scoped.

### 4. Pesquisas e configurações reais
- Migrar a tela de Pesquisas, Perguntas e Opções do estado local para funções autenticadas e consultas paginadas/tenant-scoped, com validação de relações e condições.
- Persistir apenas as configurações administrativas atualmente exibidas, vinculadas ao cartório e protegidas por papel; remover o fallback local desses fluxos após validação.
- Auditar criação, alteração, ativação/inativação, duplicação, reordenação e exclusão permitida de pesquisas/perguntas/opções, além de alterações de configuração.
- Manter a prévia pública sem registrar avaliações.

### 5. Auditoria imutável e histórico
- Centralizar a gravação de eventos em funções/ gatilhos privados; nenhum usuário poderá inserir, editar ou excluir logs diretamente.
- Cobrir usuários, papéis/status, cartório/configurações, pesquisas, perguntas, pontos, ocorrências e planos.
- Padronizar metadados com campos seguros de antes/depois e contexto operacional; omitir contatos, respostas abertas, tokens e segredos.
- Adicionar histórico contextual nas telas administrativas pertinentes.

### 6. Tela de Auditoria
- Criar `/auditoria` sob a área autenticada, visível apenas aos papéis autorizados.
- Consultar logs reais com paginação recente-primeiro e filtros por período, usuário, entidade e ação, sempre limitados ao cartório ativo.
- Exibir estados de carregamento, vazio, erro e acesso negado; ajustar menu e navegação conforme o papel.

## Validação obrigatória
- Executar matriz real para os quatro papéis, incluindo acesso de página, chamada direta de função e operação direta sujeita a RLS.
- Criar fixtures temporárias de dois cartórios para confirmar bloqueio de leitura, inserção, atualização, exclusão, URLs, RPCs e auditoria cruzadas; remover todas ao final.
- Testar escalada: papel enviado pelo cliente, troca de cartório, autoelevação, alteração do próprio status, concessão de PLATFORM_ADMIN e edição/exclusão de log.
- Testar login, logout, expiração, usuário inativo e sessão antiga após mudança de status/papel.
- Confirmar eventos e históricos de todos os módulos exigidos, paginação/filtros, ausência de dados sensíveis e índices usados.
- Rodar TypeScript, lint, testes direcionados, build automático e verificação desktop/mobile. Validar navegador autenticado somente com uma sessão autorizada disponível; caso contrário, registrar a ressalva operacional sem declarar esse item aprovado.
- Reexecutar o linter do Supabase e registrar separadamente o alerta preexistente de proteção contra senhas vazadas, caso continue fora do controle desta etapa.

## Documentação e encerramento
- Criar `PERMISSIONS_MATRIX.md` e `AUDIT_LOG.md`; atualizar `SECURITY.md`, `DATABASE_SCHEMA.md`, `roadmap.md` e a decisão arquitetural em `AGENTS.md`.
- Criar o relatório final da Etapa 12 com alterações, correções, testes, resultados, pendências e a matriz integral do roteiro.
- Classificar como APROVADA, APROVADA COM RESSALVAS ou REPROVADA somente a partir das evidências reais. Não iniciar a próxima etapa.
