# Etapa 8 — Ocorrências de Qualidade com dados reais

## Objetivo
Migrar exclusivamente o módulo de Ocorrências para o Supabase real, mantendo a avaliação de origem, o responsável, o tratamento e o histórico isolados por cartório. A Etapa 9 não será iniciada.

## Implementação
1. Endurecer o modelo existente sem duplicá-lo: preservar `ocorrencias_qualidade` e `audit_logs`, adicionar somente o identificador idempotente necessário contra duplo envio e os índices justificados pelos filtros.
2. Substituir as permissões amplas de escrita por operações autenticadas e transacionais para criar e atualizar ocorrências. O cartório, criador, responsável e avaliação serão resolvidos e validados no banco; o navegador nunca enviará `cartorio_id`.
3. Registrar em `audit_logs` a criação, mudanças relevantes, troca de responsável, transições de status e encerramento, com usuário, data e valores anteriores/novos. Exclusão comum de ocorrências e histórico ficará bloqueada.
4. Aplicar a matriz mínima existente: todos os quatro papéis podem consultar; `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR` podem criar, editar, atribuir, alterar status e encerrar; `OPERADOR` pode consultar e criar, sem editar, atribuir ou encerrar.
5. Validar transições `Nova → Em análise → Em tratamento → Resolvida → Encerrada`, permitindo permanência no status atual e impedindo saltos/retrocessos incoerentes. Resolver exigirá responsável e observação de tratamento; o banco registrará a data automaticamente.
6. Criar funções de aplicação autenticadas para listagem paginada, detalhe completo, opções de filtros, criação e atualização, usando TanStack Query para cache, estados e invalidação.
7. Reescrever `/ocorrencias` para dados reais com filtros por status, prioridade, responsável, período, categoria e avaliação; incluir loading, vazio, erro, salvando, sucesso e acesso negado, além de paginação e layout móvel.
8. Ligar “Criar ocorrência” no detalhe de uma avaliação real. O detalhe da ocorrência mostrará nota, data, ponto, pesquisa, comentário, respostas relevantes, anonimato/contato autorizado, tratamento e histórico, sem permitir trocar a origem.
9. Remover apenas a dependência de mocks do módulo de ocorrências. Planos de melhoria e demais módulos ainda não migrados permanecerão inalterados.

## Segurança e integridade
- RLS continuará exigindo o cartório da sessão para leituras; operações de escrita verificarão autenticação, papel, tenant, usuário ativo e relações compostas no banco.
- Responsáveis serão somente usuários ativos do mesmo cartório; avaliação e ponto deverão pertencer ao mesmo cartório e permanecer imutáveis após a criação.
- As operações privilegiadas terão `search_path` fixo, execução revogada de `anon` e concedida somente a `authenticated`/`service_role`; nenhum segredo ou `service_role` chegará ao navegador.
- A chave idempotente impedirá duplicidade por duplo clique ou repetição da mesma solicitação.

## Validação
- Criar fixtures temporárias em dois cartórios e testar listagem, paginação, filtros, criação manual, criação por avaliação, detalhe, edição, atribuição e fluxo completo de status.
- Testar avaliação/responsável/ocorrência de outro tenant, usuário inativo, status inválido, campos vazios, transição incoerente, duplo envio, conflito de atualização e exclusão bloqueada.
- Confirmar persistência, relações, datas, histórico imutável, matriz dos quatro papéis, ausência de segredos e limpeza das fixtures.
- Validar o fluxo visual autenticado em desktop e celular quando houver sessão disponível; caso o Supabase externo impeça injeção, registrar a limitação sem substituir a evidência por mocks.
- Criar `QUALITY_OCCURRENCES.md`, relatório final e matriz dos 19 itens, classificando a etapa somente pelas evidências obtidas.

## Fora do escopo
Planos de melhoria reais, PDFs, notificações, e-mail, WhatsApp, pagamentos, IA, benchmarking, integrações externas, NFC avançado e qualquer item da Etapa 9.