# Onboarding de cartórios — Etapa 15

## Escopo

O módulo **Implantações** é exclusivo do `PLATFORM_ADMIN` e conduz um cartório por oito etapas persistidas: Cartório, Administrador, Pesquisa, Perguntas, Ponto, QR Code, Teste e Ativação. Não inclui pagamentos, assinatura, cobrança, emissão fiscal, notificações comerciais, IA, CRM, campanhas ou NFC físico.

## Fluxo

1. Criar o cartório com CNPJ único; ele nasce `inativo`, no ambiente `real` e com configuração própria.
2. Convidar um administrador inicial, sempre com papel `CARTORIO_ADMIN` limitado ao novo tenant.
3. Criar uma pesquisa vazia ou com o modelo inicial editável.
4. Revisar perguntas e publicar somente quando houver pergunta obrigatória e opções válidas.
5. Criar um ponto ligado à pesquisa publicada. Código público e slug são gerados no servidor.
6. Conferir e entregar o QR produzido a partir da URL canônica.
7. Preparar o acesso temporário de teste. O cartório e o ponto continuam inativos; a avaliação recebe `is_test=true` e não aparece em indicadores, relatórios ou listas operacionais.
8. Ativar somente após o checklist completo. Desativação e reativação ficam disponíveis no mesmo fluxo.

## Persistência, retomada e erros

`cartorio_onboarding` mantém status, etapa corrente, pesquisa, ponto, avaliação de teste e horários. Reabrir a tela recupera o progresso; operações de criação são específicas e a criação do cartório usa uma chave de requisição idempotente.

A interface traduz duplicidade, pesquisa incompleta, onboarding incompleto, falta de permissão e falhas gerais sem mostrar SQL. Convites incompletos são compensados com remoção do usuário Auth recém-criado.

## Segurança e isolamento

Wrappers `SECURITY INVOKER` no schema público preservam a identidade autenticada. As rotinas internas validam `auth.uid()`, usuário ativo e `PLATFORM_ADMIN`; RLS e chaves compostas impedem relações cruzadas. O navegador não recebe a service role. A avaliação pública usa código opaco e o teste exige token temporário separado.

## Auditoria

São registrados: criação do cartório, início/progresso do onboarding, administrador, pesquisa, publicação, ponto, QR, preparação/conclusão do teste, ativação, desativação e reativação. Metadados não incluem contato pessoal desnecessário.

## Estados

- `IN_PROGRESS`: configuração incompleta.
- `READY_FOR_TEST`: token temporário emitido; produção permanece inativa.
- `ACTIVE`: checklist completo e operação pública liberada.
- `BLOCKED`: desativação administrativa; o QR público fica indisponível.

## Matriz final de validação

| Cenário | Resultado | Evidência |
|---|---|---|
| A — implantação completa | Aprovado | Cartório, administrador, pesquisa, perguntas, ponto, QR, teste e ativação concluídos |
| B — interrupção e retomada | Aprovado | Checklist persistido e recuperado sem perda de progresso |
| C — dados inválidos | Aprovado | Dados cadastrais inválidos rejeitados antes da criação |
| D — duplicidade e ativação incompleta | Aprovado | CNPJ duplicado e ativação sem checklist bloqueados |
| E — isolamento entre cartórios | Aprovado | Administradores de dois cartórios não visualizaram o tenant oposto |
| F — QR antes da ativação | Aprovado | Jornada pública permaneceu indisponível até a ativação |
| G — teste e repetição | Aprovado | Avaliação de teste concluída; repetição retornou o mesmo resultado sem duplicar dados |
| H — ciclo operacional | Aprovado | Ativação, avaliação real, indicadores, relatório, desativação e reativação validados |
| Auditoria | Aprovado | Eventos do ciclo completo registrados com tratamento seguro do operador da plataforma |
| Limpeza | Aprovado | Dois cartórios, três usuários Auth e dados dependentes de teste removidos ao final |
| Interface pública | Aprovado | 320, 360, 390 e 430 px sem rolagem horizontal ou erros no console |
| Compilação | Aprovado | Verificação final sem erros |

Resultado automatizado: **16 verificações aprovadas**. A matriz foi executada com duas organizações independentes e sessões autenticadas distintas.

## Classificação final

**APROVADA COM RESSALVAS OPERACIONAIS.** A origem HTTPS definitiva deve ser definida em `VITE_PUBLIC_APP_URL` antes da entrega do QR de produção. O convite definitivo depende de e-mail institucional válido, e a instalação física do QR permanece uma atividade local. A proteção contra senhas vazadas continua desativada no provedor de autenticação e deve ser avaliada separadamente.

**ETAPA 15 — ONBOARDING E IMPLANTAÇÃO DO CARTÓRIO VALIDADA.**

A Etapa 16 não foi iniciada.
