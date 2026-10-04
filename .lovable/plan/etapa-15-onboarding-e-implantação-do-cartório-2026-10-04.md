# Etapa 15 — Onboarding e implantação do cartório

## Objetivo
Entregar exclusivamente o fluxo seguro e recuperável:

**Novo Cartório → Administrador → Pesquisa/Perguntas → Ponto → QR Code → Teste → Ativação**

O trabalho seguirá obrigatoriamente **IMPLEMENTAR → TESTAR → CORRIGIR → VALIDAR**, sem iniciar a Etapa 16.

## 1. Consolidar a auditoria inicial
- Registrar o que será reutilizado: autenticação e convite Supabase, quatro papéis, permissões, cadastro de cartório, pesquisas/perguntas/opções, pontos, QR, avaliação pública, indicadores, relatórios e auditoria.
- Confirmar no banco as restrições, políticas RLS, funções existentes, dados DEMO e resíduos de testes anteriores.
- Tratar como lacunas principais: provisionamento multi-tenant pelo `PLATFORM_ADMIN`, progresso persistente, teste separado dos indicadores, ativação atômica e gestão segura de desativação/reativação.

## 2. Criar a base segura do onboarding
- Adicionar uma entidade tenant-scoped de onboarding com status mínimo (`IN_PROGRESS`, `READY_FOR_TEST`, `ACTIVE`, `BLOCKED`), etapa atual, referências aos recursos criados, idempotência e timestamps.
- Adicionar `is_test` às avaliações, com padrão seguro, e excluir testes de todos os indicadores e relatórios existentes.
- Criar funções transacionais para:
  - iniciar um cartório incompleto como inativo;
  - salvar cada etapa sem duplicar recursos;
  - calcular o checklist no servidor;
  - publicar somente pesquisa consistente;
  - registrar teste recebido;
  - ativar, desativar e reativar sem apagar histórico.
- Validar no servidor papel, tenant, vínculos entre pesquisa/ponto/cartório, estados e transições. O navegador nunca escolhe `PLATFORM_ADMIN` nem define outro tenant livremente.
- Conceder somente os privilégios necessários, manter RLS ativa e registrar os eventos exigidos sem PII desnecessária.

## 3. Provisionar administrador com convite seguro
- Reutilizar Supabase Auth e o envio de convite, sem armazenar ou transmitir senha.
- Permitir que apenas `PLATFORM_ADMIN` inicie outro tenant e crie o primeiro `CARTORIO_ADMIN`.
- Tornar criação + vínculo + papel idempotentes e compensar falhas entre Auth e banco.
- Manter `CARTORIO_ADMIN` limitado ao próprio cartório e impedir autoelevação.

## 4. Construir o fluxo guiado
- Criar uma área de **Implantações** visível somente ao `PLATFORM_ADMIN`, com lista, status e retomada.
- Criar o assistente responsivo com progresso claro e etapas dependentes:
  1. Cartório
  2. Administrador
  3. Pesquisa e perguntas
  4. Ponto
  5. QR Code
  6. Teste
  7. Ativação
- Reutilizar formulários, validações e QR existentes, sem duplicar módulos administrativos.
- Oferecer template inicial editável, nunca obrigatório.
- Permitir voltar, atualizar a página, sair e retornar sem perda nem duplicação.
- Exibir checklist calculado, revisão final, estados de carregamento/erro/sucesso e ajuda contextual curta.

## 5. Implementar teste e ciclo operacional
- Abrir o QR do ponto em modo de teste autorizado e identificá-lo no servidor, sem confiar apenas em parâmetro do navegador.
- Confirmar avaliação recebida, banco, dashboard e relatório sem contaminar métricas reais.
- Habilitar **Ativar Cartório** apenas quando os requisitos obrigatórios forem verdadeiros no banco.
- Na ativação, tornar cartório, pesquisa e ponto operacionais de forma atômica e registrar `CARTORIO_ACTIVATED`.
- Na desativação, bloquear novas avaliações públicas e preservar todo o histórico; na reativação, restaurar o QR existente sem reconstrução.

## 6. Dados DEMO e operação
- Identificar claramente o tenant de demonstração e impedir que seus dados apareçam em tenants reais.
- Remover somente fixtures temporárias/resíduos comprovados de testes anteriores; preservar o DEMO intencional.
- Garantir que o fluxo normal não exija SQL, edição manual do banco, variável por cliente, QR manual ou criação manual no Supabase.

## 7. Testar, corrigir e validar
Executar testes reais e repetir após cada correção:
- **A:** novo cartório completo até ativação;
- **B:** interrupção, refresh, logout/login e retomada;
- **C:** dados inválidos e falha de conexão;
- **D:** duplo clique, repetição e duplicidades;
- **E:** dois cartórios com isolamento de usuários, pesquisas, pontos, QR, avaliações, indicadores, relatórios e auditoria;
- **F:** QR antes/depois da ativação;
- **G:** avaliação de teste e avaliação real ponta a ponta;
- **H:** desativação e reativação preservando histórico.

Também validar permissões dos quatro papéis, tentativa de `PLATFORM_ADMIN`, manipulação de IDs/tenant/role, concorrência, performance, acessibilidade e layouts em celular, tablet, notebook e desktop. Limpar todas as fixtures de teste ao final.

## 8. Documentar e classificar
- Criar `ONBOARDING.md`, `TENANT_PROVISIONING.md`, `DEPLOYMENT_CHECKLIST.md` e `FIRST_CARTORIO_SETUP.md`.
- Atualizar documentação afetada de banco, segurança, permissões e auditoria.
- Atualizar o roteiro do projeto com a matriz final completa: provisionamento, configuração, teste, produção, segurança e operação.
- Informar funcionalidades, alterações, testes, resultados, documentos, pendências, limitações e classificação final.
- Declarar **“ETAPA 15 — ONBOARDING E IMPLANTAÇÃO DO CARTÓRIO VALIDADA.”** somente se os critérios de aprovação forem realmente atendidos.

## Limites explícitos
Não implementar pagamentos, assinatura, cobrança, emissão fiscal, notificações comerciais, IA, CRM, campanhas, NFC físico nem qualquer item da Etapa 16.

## Decisões técnicas
- O provisionamento cross-tenant usará uma função autenticada: primeiro valida o papel do chamador por RLS; somente depois carrega o cliente privilegiado dentro do servidor para criar Auth/tenant de forma controlada.
- O checklist será derivado do estado real do banco, não de caixas marcadas pelo navegador.
- Avaliações de teste serão persistidas e auditáveis, mas filtradas centralmente de métricas e relatórios.
- Ativação será uma transação no banco para evitar estados parcialmente operacionais.
