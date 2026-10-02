# Etapa 1 do backend — estrutura PostgreSQL externa

## Objetivo
Criar e validar somente a estrutura do banco externo do CartoQuali, alinhada ao domínio e à documentação atuais. O frontend continuará usando os mocks em memória, sem autenticação, RLS, API ou integração de leitura/escrita com o banco.

## Pré-requisito
- Conectar o projeto externo em **Configurações do projeto → Conectores → Supabase** antes da execução.
- Não habilitar nem usar o banco nativo do Lovable.

## Implementação

### 1. Modelo relacional e migrations
- Criar migrations reproduzíveis com UUIDs e timestamps para:
  - `cartorios`
  - `usuarios`
  - `user_roles`
  - `pontos_avaliacao`
  - `pesquisas`
  - `perguntas`
  - `opcoes_resposta`
  - `avaliacoes`
  - `respostas`
  - `ocorrencias_qualidade`
  - `planos_melhoria`
  - `audit_logs`
- Manter `registryId` no frontend e documentar sua equivalência com `cartorio_id` no banco.
- Preservar os relacionamentos do fluxo Cartório → Pesquisa/Ponto → Avaliação → Resposta → Ocorrência → Plano.

### 2. Integridade e segurança desta etapa
- Definir chaves primárias, estrangeiras, nulabilidade, unicidade e regras de exclusão coerentes com a rastreabilidade.
- Adicionar checks moderados para status, tipo de pergunta, prioridade, nota e progresso.
- Garantir unicidade contextual para código/slug de ponto, ordem de pergunta e e-mail de usuário por cartório; manter CNPJ único.
- Guardar papéis em `user_roles`, e não diretamente em `usuarios`, deixando a associação preparada para autenticação futura sem implementá-la agora.
- Criar índices apenas para chaves estrangeiras e filtros frequentes solicitados.
- Como RLS pertence à etapa seguinte, revogar acesso de `anon` e `authenticated` e conceder acesso somente a `service_role`, evitando exposição acidental enquanto as políticas não existem.
- Não criar lógica de auditoria; `audit_logs` ficará apenas estruturalmente preparado.

### 3. Dados DEMO reproduzíveis
- Criar um script de seed versionado e idempotente, separado da migration estrutural.
- Inserir dados claramente fictícios: 1 cartório, 3 usuários, 3 pontos, 1 pesquisa, perguntas/opções, avaliações/respostas, ocorrências e planos.
- Aplicar o seed no banco externo e manter o frontend inalterado sobre seus mocks atuais.

### 4. Validação técnica
- Consultar o catálogo do PostgreSQL para confirmar tabelas, colunas, tipos, defaults, índices, constraints e relacionamentos.
- Executar o encadeamento válido solicitado, confirmando UUIDs e timestamps.
- Executar testes negativos transacionais para ponto sem cartório, avaliação sem cartório, resposta sem avaliação, pergunta sem pesquisa, progresso acima de 100 e status inválido.
- Confirmar que todos os testes negativos falham pelas constraints esperadas e que nenhum dado de teste inválido permanece salvo.

### 5. Documentação e relatório final
- Criar `DATABASE_SCHEMA.md` com finalidade, campos, obrigatoriedade, relacionamentos e regras de cada tabela, além do diagrama lógico.
- Atualizar a documentação arquitetural apenas para registrar a existência do banco externo, sem afirmar que o frontend já o consome.
- Registrar as decisões estruturais aplicáveis e a Etapa 1 no roadmap.
- Entregar relatório com tabelas, relacionamentos, índices, constraints, migrations, seed, testes aprovados/reprovados, problemas, ajustes e pendências.
- Classificar a etapa como **APROVADA**, **APROVADA COM RESSALVAS** ou **REPROVADA** conforme os testes reais.

## Fora do escopo
- Login, cadastro, recuperação de senha, autenticação, JWT e permissões reais.
- RLS e políticas de acesso por usuário/cartório.
- API pública, troca do provedor mock, persistência do frontend ou chamadas ao banco.
- Rate limiting, QR/NFC real, pagamentos, notificações, e-mail, WhatsApp ou IA.
- Início automático da Etapa 2.
