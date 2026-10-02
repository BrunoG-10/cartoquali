# Etapa 1 — Estrutura do banco externo do CartoQuali

## Objetivo
Preparar e validar somente o modelo PostgreSQL externo, sem conectar o frontend, substituir os mocks ou iniciar autenticação e segurança da próxima etapa.

## Implementação
1. Criar uma migration reproduzível com UUIDs, timestamps, chaves, relacionamentos, validações e índices para: cartórios, usuários, papéis, pontos, pesquisas, perguntas, opções, avaliações, respostas, ocorrências, planos e auditoria.
2. Manter papéis separados de usuários e garantir, por chaves compostas, que relações operacionais permaneçam no mesmo cartório.
3. Bloquear acesso público às tabelas nesta etapa; RLS e permissões reais ficam explicitamente adiadas.
4. Criar um seed idempotente e claramente fictício com um cartório, três usuários, três pontos, uma pesquisa, perguntas, respostas, avaliações, ocorrências e planos.
5. Criar validações SQL transacionais para conferir catálogo, encadeamento e rejeição de relações, progresso e status inválidos.
6. Documentar as tabelas, relações e a equivalência `registryId` → `cartorio_id`, sem alterar o funcionamento atual do MVP.

## Aplicação no banco
O endereço informado não concede acesso administrativo. Como a conexão externa não está vinculada ao projeto, os arquivos reproduzíveis serão preparados primeiro; a aplicação e a validação remota ficarão pendentes até a conexão ser feita em **Configurações do projeto → Integrações → Supabase**.

## Fora do escopo
Login, recuperação de senha, JWT, RLS, API, troca do provedor mock, persistência do frontend, rate limiting, QR/NFC, pagamentos, notificações, e-mail, WhatsApp e IA.

## Critério de conclusão
A etapa será classificada como **APROVADA COM RESSALVAS** enquanto a migration não puder ser executada no banco externo. Após conexão e testes remotos bem-sucedidos, passa a **APROVADA**.
