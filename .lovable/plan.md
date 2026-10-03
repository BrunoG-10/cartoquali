# Etapa 13 — LGPD, Privacidade e Governança de Dados

## Objet/Result esperado

Implementar suporte técnico à privacidade e à governança sem declarar conformidade jurídica total. Manter a avaliação sem identificação cadastral como fluxo padrão, separar contato opcional, restringir dados pessoais e oferecer um processo administrativo auditável para solicitações de titulares.

## Auditoria confirmada

- O fluxo público aceita avaliação sem conta e usa somente o código público do ponto, mas o aviso `/privacidade` ainda afirma incorretamente que o sistema não usa banco.
- Contato é opcional e validado, porém as consultas de listagem ainda selecionam colunas de contato antes de descartá-las; o detalhe limita contato a administrador/gestor.
- Comentários e outros textos livres podem receber dados pessoais ou sensíveis; faltam aviso contextual e visualização administrativa redigida.
- Dashboard e indicadores são agregados; CSV geral não precisa nem deve receber contato.
- A auditoria administrativa atual duplica telefone/e-mail em metadados históricos; esses valores devem ser removidos sem apagar a trilha operacional.
- A permissão de contato diverge entre detalhes de avaliação e ocorrência; será centralizada numa única capacidade administrativa.
- O navegador guarda somente sessão de autenticação e uma chave técnica de idempotência temporária; não há analytics adicional implementado.
- O antiabuso guarda hash técnico temporário, sem IP ou user-agent em claro.
- Não existem política de retenção configurável, solicitações de privacidade, fluxo de anonimização nem auditoria específica de acesso a contato/exportação.
- Há funções privadas de gestão de usuários que ainda precisam ter o privilégio direto revisado durante o hardening.
- O canal jurídico/controlador/DPO ainda não foi informado; ficará marcado como pendência configurável, sem inventar dados.

## Implementação

### 1. Modelo de governança no Supabase

- Criar `privacy_requests`, tenant-scoped, com tipo, descrição, contato mínimo, status, responsável, notas internas e datas.
- Criar configuração de privacidade por cartório: versão/data do aviso, canal público opcional e prazos de retenção nullable. Prazo vazio significará “pendente de definição jurídica/contratual”; nada será apagado automaticamente.
- Registrar na avaliação somente a versão/data da autorização específica de contato quando ela for escolhida; avaliação sem contato não receberá consentimento artificial.
- Conceder somente os privilégios necessários, ativar RLS e permitir acesso apenas a `PLATFORM_ADMIN`/`CARTORIO_ADMIN` no tenant atual.
- Criar índices por `cartorio_id`, `created_at`, `status`, `request_type` e `responsible_user_id`.
- Criar operações atômicas para abrir, atribuir, atualizar e concluir solicitações; validar transições, limites de texto e relações do mesmo tenant.
- Criar operação controlada de minimização em avaliação de teste/solicitação válida: remover contato e redigir textos selecionados sem apagar nota, respostas estruturadas ou indicadores.
- Auditar abertura, atribuição, conclusão e minimização sem copiar conteúdo pessoal para `audit_logs`.
- Remover telefone/e-mail dos novos metadados de auditoria administrativa e redigir cópias históricas desses campos, preservando ação, entidade, autoria e datas.
- Corrigir privilégios residuais de funções privadas e confirmar `search_path`, `EXECUTE` e ausência de acesso anônimo indevido.

### 2. Minimização e separação de contato

- Alterar listagens de avaliações para nunca selecionar nome, telefone ou e-mail.
- Manter contato somente no detalhe autorizado; registrar evento de visualização restrita quando tecnicamente seguro, sem registrar os valores.
- Centralizar a capacidade de visualizar contato e aplicá-la igualmente aos detalhes de avaliação e ocorrência.
- Não copiar contato para ocorrências, planos, indicadores, relatórios gerais ou CSV.
- Manter comentário fora de resumos agregados e oferecer estado redigido na cadeia operacional quando a solicitação exigir.
- Reforçar validação Zod no cliente e servidor: tamanhos, e-mail, telefone, descrição, notas e enums.

### 3. Transparência pública

- Atualizar `/privacidade` com linguagem clara sobre dados, finalidades, contato opcional, armazenamento, segurança, retenção pendente, direitos, compartilhamento e responsabilidades.
- Criar `/termos` como base operacional explicitamente pendente de revisão jurídica.
- Exibir aviso curto no início/finalização da avaliação e próximo a comentários livres, com links para Privacidade e Termos.
- Usar “avaliação sem identificação no cadastro do CartoQuali”; remover promessas absolutas de anonimato ou conformidade.
- Nunca inventar CNPJ, DPO, endereço ou e-mail; quando ausente, indicar canal pendente de configuração.

### 4. Operação administrativa

- Criar `/solicitacoes-privacidade` com lista paginada, filtros, detalhe, criação manual, responsável, status, observações e conclusão.
- Incluir acesso no menu apenas para administradores e repetir a autorização no servidor/RLS.
- Permitir registrar pedidos de confirmação, acesso, correção, informação, eliminação quando aplicável, oposição/revogação e outros, sem prometer execução automática.
- Disponibilizar ações explícitas de remoção de contato e redação de texto somente para administradores, com confirmação e trilha de auditoria.
- Adicionar seção de privacidade/configuração com prazos sem valores inventados e estado de revisão jurídica.

### 5. Retenção, exportação e documentação

- Documentar finalidade, classificação, retenção, anonimização/exclusão e responsável por definição para avaliações, respostas, contatos, usuários, auditoria, ocorrências e planos.
- Confirmar que CSV e impressão geral não contêm contato, nome de avaliador ou identificadores internos desnecessários.
- Registrar exportações gerais em auditoria; exportação pessoal, se necessária, ficará separada e restrita.
- Criar `PRIVACY_BY_DESIGN.md`, `PRIVACY_NOTICE.md`, `DATA_RETENTION.md`, `PRIVACY_REQUESTS.md`, `LGPD_IMPLEMENTATION.md` e relatório final da Etapa 13; atualizar Segurança, esquema, arquitetura e roadmap.

## Testes e validação

Executar na ordem IMPLEMENTAR → TESTAR → CORRIGIR → VALIDAR:

1. Envio público sem contato e confirmação de ausência de nome/e-mail/telefone/usuário administrativo.
2. Envio com contato voluntário, consentimento específico e armazenamento separado.
3. Papel autorizado visualiza contato; papel não autorizado e outro tenant não visualizam.
4. Listas, dashboard, relatórios, CSV, URLs, erros e auditoria não vazam contato ou IDs internos desnecessários.
5. Solicitações de privacidade respeitam papéis, tenant, estados e auditoria imutável.
6. Minimização em fixture remove contato/texto selecionado, preserva nota e indicadores e gera evento sem PII.
7. Busca estática por PII, storage, logs, analytics, secrets e frases absolutas.
8. Linter Supabase, RLS, funções privilegiadas, índices, TypeScript e build.
9. Playwright em 390×844 e 1280×1800 para fluxo público, Privacidade, Termos e estados administrativos quando houver sessão disponível.
10. Limpeza de todas as contas e fixtures de teste.

## Critério de conclusão

A etapa só será classificada após os testes reais. Ausência de sessão visual autenticada será registrada como ressalva operacional. A conclusão declarará explicitamente que as medidas apoiam a conformidade e dependem de definições jurídicas/contratuais do controlador e do operador. Nenhuma etapa posterior, marketing, CRM, disparo, venda de dados ou analytics será iniciada.
