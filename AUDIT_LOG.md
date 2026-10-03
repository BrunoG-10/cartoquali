# Auditoria Operacional — Etapa 12

## Cobertura

A trilha registra eventos de cartório, usuários, papéis, pesquisas, perguntas, opções, configurações, pontos de avaliação, ocorrências e planos de melhoria. Cada evento contém cartório, usuário quando identificável, ação, entidade, identificador, metadados mínimos e horário.

## Segurança e privacidade

- Eventos são incluídos por gatilhos do banco, não pelo navegador.
- Usuários autenticados não podem criar, alterar ou excluir eventos.
- Apenas `PLATFORM_ADMIN` e `CARTORIO_ADMIN` consultam a auditoria do próprio cartório.
- Metadados evitam senha, token, chave, comentário de avaliação e dados de contato desnecessários.
- Alterações administrativas armazenam antes/depois apenas para campos operacionais relevantes.

## Tela

A rota `/auditoria` oferece paginação de 25 eventos, filtros por entidade, ação e período, ordenação do evento mais recente para o mais antigo e identificação do responsável quando disponível.

## Evidência de validação

A matriz direta com contas temporárias aprovou 12/12 cenários: leitura administrativa no próprio tenant; bloqueio de autoelevação direta por administrador e gestor; bloqueio da lista de usuários para gestor; bloqueio da auditoria para operador; isolamento da auditoria; criação de pesquisa pelo gestor; bloqueios por papel e tenant; configurações restritas; gravação direta de auditoria negada; e perda de leitura para sessão de usuário inativado. Todas as contas e entidades temporárias foram removidas.