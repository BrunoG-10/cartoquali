# Segurança da API pública — Etapa 14

## Fronteira

O browser chama funções TanStack; somente o servidor usa `service_role`. `anon` e `authenticated` não executam as RPCs e não leem avaliações, respostas ou contatos diretamente.

## Validações

- código: 3–80 caracteres;
- chave idempotente e token de sessão: UUID;
- até 50 respostas e 32 KiB por envelope;
- texto: até 1.000 caracteres;
- múltipla escolha: até 20 valores de 200 caracteres;
- contato: envelope de até 4 KiB e limites por campo;
- pergunta, opção, condição, pesquisa, ponto e cartório devem pertencer ao mesmo contexto ativo.

O banco rejeita perguntas desconhecidas ou de outro tenant, respostas obrigatórias ausentes e tipos/valores inválidos antes da gravação transacional.

## Abuso, cache e XSS

O limite atual permite oito novas submissões por token efêmero em dez minutos. O token é aleatório por sessão de navegador e seu hash é calculado com segredo no servidor, evitando bloquear pessoas distintas apenas por compartilharem IP/Wi-Fi. Abrir outra sessão pode contornar o limite; isso é uma limitação aceita desta defesa leve.

Respostas públicas usam `no-store` e `nosniff`. Comentários não são injetados como HTML. O teste com `<script>` confirmou ausência de execução e de erro no console.
