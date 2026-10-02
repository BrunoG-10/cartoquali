# Preparação do CartoQuali para backend externo

## Objetivo
Concluir o desacoplamento arquitetural do MVP sem alterar o design, os fluxos validados ou o uso exclusivo de dados em memória. O resultado continuará funcional com mocks e terá contratos claros para uma futura API externa.

## Escopo de implementação

### 1. Consolidar contratos e tipos compartilhados
- Completar os tipos centrais para respostas de serviço, erros previstos, filtros comuns, auditoria e contexto da sessão.
- Manter `registryId` como chave interna equivalente ao futuro `cartorio_id`, sem renomear todo o frontend nem quebrar os dados atuais.
- Padronizar filtros de avaliações, ocorrências, planos e relatórios, incluindo período, ponto, pesquisa, nota, categoria, prioridade e status conforme cada entidade.

### 2. Completar a camada de serviços e o provedor mock
- Ampliar o contrato principal com consultas de cartórios, usuário atual, perguntas, respostas, auditoria e histórico de relatórios.
- Tornar todas as consultas e alterações dependentes do cartório ativo, inclusive perguntas e operações administrativas que hoje ainda não recebem esse contexto explicitamente.
- Criar uma seleção tipada do provedor `mock`, deixando o ponto de extensão para `api` explícito, mas sem implementar chamadas reais.
- Fazer o estado compartilhado consumir operações com formato de serviço, preservando as alterações apenas durante a sessão e mantendo componentes sem acesso direto aos arquivos mock.

### 3. Preparar permissões, erros e auditoria
- Centralizar `hasPermission(permission)` sobre o usuário e as permissões mockadas atuais, sem bloquear telas nem simular autenticação real.
- Definir o contrato de estados `loading`, `success`, erros de validação/autorização/conflito/servidor/rede e uma forma uniforme de retornar falhas futuras.
- Completar o modelo e o acesso mock de eventos de auditoria para ações administrativas, sem criar uma nova tela ou persistência.

### 4. Preservar cálculos e isolamento
- Manter indicadores e janelas de data nas funções puras já compartilhadas por Dashboard, Qualidade e Relatórios.
- Remover lógicas de filtro duplicadas ainda existentes nas páginas, encaminhando-as às funções compartilhadas.
- Reforçar a validação de integridade dos mocks e o isolamento por cartório em leituras por ID, relações e submissão pública.

### 5. Documentar a integração futura
- Criar `API_CONTRACT.md` com endpoints, parâmetros, filtros, payloads, respostas e erros esperados, incluindo o `POST /avaliacoes` público e opcionalidade de contato.
- Expandir `ARCHITECTURE.md` com o fluxo UI → serviços → provedor mock → futura API externa, responsabilidades das camadas e regra de não depender do banco.
- Expandir `BACKEND_REQUIREMENTS.md` com autenticação, vínculo usuário-cartório, entidades, relações, segurança, auditoria, avaliação pública, indicadores e relatórios.
- Registrar um resumo técnico com arquivos, serviços, tipos, contratos, pendências do backend e problemas encontrados, sem implementar o backend.

### 6. Validar sem regressões
- Adicionar testes focados nos contratos, filtros, indicadores, isolamento por cartório e integridade relacional dos mocks.
- Verificar Dashboard, Avaliações, avaliação pública com falha e nova tentativa, Qualidade, Ocorrências, Planos, Relatórios e Configurações.
- Confirmar que os mesmos indicadores continuam visíveis, que não há importação direta de mocks nas páginas e que tipos e build permanecem válidos.

## Detalhes técnicos
- O provedor de sessão continuará sendo a única fonte mutável da demonstração; recarregar a página continuará descartando alterações.
- `CartoQualiService` será a fronteira estável para o adaptador futuro, sem código HTTP nesta etapa.
- `reportService` e as funções de analytics permanecerão responsáveis pelos modelos de relatório e fórmulas, evitando cálculos na apresentação.
- Não serão adicionados banco, autenticação real, migrations, RLS, API, pagamentos, NFC/QR real ou novas páginas de negócio.

## Resultado esperado
MVP visualmente inalterado e operando com mocks, com serviços e tipos centralizados, isolamento por cartório verificável e documentação suficiente para implementar um backend externo na próxima fase sem reconstruir a interface.
