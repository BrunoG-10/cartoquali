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
