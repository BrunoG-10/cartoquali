# Landing Page Comercial do CartoQuali

## Estrutura e conversão

A rota pública `/` apresenta a narrativa problema → valor → funcionamento → evidência visual → diferencial → objeções → demonstração. As áreas autenticadas, o login e a avaliação pública permanecem em suas rotas existentes.

Os CTAs do hero, problema, dashboard, benefícios, header e encerramento abrem uma conversa com o WhatsApp comercial **(86) 98184-6766**, usando uma mensagem inicial sobre a demonstração. “Falar com um especialista” e o contato do rodapé usam o mesmo destino.

## Captação de contatos

Os contatos são gravados em `commercial_leads`, nunca nas tabelas de avaliações. A submissão usa validação no navegador e no servidor, honeypot, limite por sessão, idempotência, resposta sem cache e cliente `service_role` somente no servidor. A tabela tem RLS, bloqueio explícito para `anon` e `authenticated` e acesso de infraestrutura restrito a `service_role`.

Após o formulário ser validado e registrado, o visitante é encaminhado ao WhatsApp comercial com os dados preenchidos organizados na mensagem. Não há disparo automático de e-mail, mensagem ativa ou integração com CRM nesta versão.

## Privacidade e segurança

- Nenhum dado de cartório, usuário ou avaliação é consultado pela landing page.
- Mockups e números são estáticos e identificados como ilustrativos.
- O formulário coleta apenas nome, cartório, cidade/UF, cargo, WhatsApp e e-mail.
- A copy não afirma homologação, parceria, certificação, anonimato absoluto ou conformidade jurídica total.
- O contato de teste ponta a ponta foi removido por identificador; nenhum dado real foi alterado.

## SEO, acessibilidade e performance

O documento define title, meta description, Open Graph, Twitter card, URL canônica e hierarquia semântica de headings. Navegação, menu, formulário, mensagens de erro e sucesso usam controles e estados acessíveis. A página usa apenas componentes e ilustrações CSS/HTML locais, sem carregar o dashboard ou consultar o banco na renderização.

## Validação executada

- Build automatizado: aprovado.
- Navegação Playwright: desktop 1280 px, tablet 1024 px e mobile 320/360/390/430 px.
- Sem overflow horizontal ou erros de console em todas as larguras.
- Menu compacto, âncoras, CTA, validação vazia, envio real e confirmação testados.
- Rotas `/login`, `/dashboard`, `/privacidade`, `/termos` e `/avaliar` responderam sem quebra.
- Auditoria textual não encontrou afirmações comerciais proibidas; a menção oficial à ANOREG/PQTA aparece somente como pergunta, respondida com negativa explícita.
- Linter do banco: nenhuma ocorrência nova; permanece apenas a proteção contra senhas vazadas desativada no Auth.

## Auditoria de conversão

1. O produto e o público ficam claros na primeira tela.
2. O problema de gestão sem indicadores é explicado.
3. A relevância diária e setorial é contextualizada sem vínculo oficial indevido.
4. O fluxo em quatro passos é visível.
5. Dashboard, avaliação móvel, QR e ocorrência são demonstrados por mockups fiéis e ilustrativos.
6. O diferencial avaliação → ocorrência → plano → resultado é explícito.
7. Privacidade, independência setorial, FAQ e linguagem sem promessas reduzem objeções.
8. O próximo passo é consistente: solicitar demonstração.
9. Aplicativo, conta, QR, multipontos, avaliações negativas e avaliações oficiais são respondidos.
10. A página vende o resultado de gestão, não apenas uma lista de funcionalidades.

## Pendências operacionais

- Definir responsável e processo para atendimento das conversas recebidas no WhatsApp.
- Integrar CRM ou e-mail somente quando houver canal empresarial confirmado.
- Configurar URL HTTPS e imagem social absolutas de produção antes da publicação final.
- Ativar proteção contra senhas vazadas no provedor Supabase Auth.

Classificação: **VALIDADA COM RESSALVAS OPERACIONAIS**.