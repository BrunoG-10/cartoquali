# Pontos de Avaliação

## Objetivo

Pontos de avaliação representam os locais físicos ou momentos de atendimento em que uma pesquisa é disponibilizada. Cada ponto pertence a um único cartório, referencia uma pesquisa ativa e possui um código público único.

## Administração

- `PLATFORM_ADMIN`, `CARTORIO_ADMIN` e `GESTOR` podem criar, editar, ativar e desativar pontos do próprio cartório.
- `OPERADOR` pode consultar os pontos, links e QR Codes, sem alterá-los.
- Exclusão física é bloqueada para preservar avaliações, respostas e trilhas de auditoria.
- Desativar um ponto interrompe novas avaliações sem apagar o histórico.
- A troca de pesquisa afeta somente avaliações futuras; registros anteriores continuam ligados à pesquisa usada no envio.

## Endereço público

O endereço canônico é `/avaliar/{CODIGO}`. Em produção, configure `VITE_PUBLIC_APP_URL` com a origem pública HTTPS, sem barra final. No navegador, a aplicação usa a origem atual como fallback.

O código aceita de 3 a 40 letras maiúsculas, números e hífens e é globalmente único sem diferenciar maiúsculas e minúsculas. Ao editar o código, o novo endereço canônico muda, mas o `public_slug` anterior continua válido para preservar materiais já impressos.

## QR Code

A página administrativa oferece visualização, download PNG em 1200 px com correção de erro alta e impressão de um cartaz com nome, localização, código e endereço legível. O QR Code contém apenas a URL pública; não contém UUID, sessão, token ou chave.

## Segurança e privacidade

- Leituras e mutações administrativas dependem da sessão Supabase e da RLS tenant-scoped.
- O cartório é derivado da sessão no servidor e não é aceito como autoridade do cliente.
- Pesquisa e ponto devem pertencer ao mesmo cartório, e a pesquisa precisa estar ativa.
- A rota pública expõe somente os dados mínimos necessários para responder à pesquisa.
- Contexto e submissão pública são executados por Server Functions; as RPCs privilegiadas não são executáveis por `anon` ou `authenticated`.
- Alterações de nome, código, pesquisa e status são registradas em `audit_logs`.

## Estados públicos

- Código válido e ponto ativo: questionário disponível.
- Ponto inativo: indisponibilidade explícita, sem formulário.
- Código inexistente: “Ponto de avaliação não encontrado”.
- Pesquisa ou cartório indisponível: mensagem segura, sem revelar identificadores internos.

## Validação da Etapa 11

O fluxo real foi exercitado em `/avaliar/CQ-REC-001` em viewport móvel, sem overflow ou erros de console. A submissão anônima gerou uma avaliação nota 5 e quatro respostas persistidas no Supabase. O contexto também foi verificado em 320, 360, 390, 414, 430 e 1280 px. Regras de RLS, papéis, relações entre tenants, unicidade, imutabilidade histórica e bloqueio de exclusão foram verificadas no banco.
