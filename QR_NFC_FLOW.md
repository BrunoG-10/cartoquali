# Fluxo QR e preparação para NFC — Etapa 14

Pontos usam uma única URL canônica produzida por `getEvaluationUrl(codigo)`. A mesma URL alimenta link, QR em tela, download PNG e cartaz; também é o endereço preparado para futura gravação em tag NFC.

O caminho expõe somente o código público opaco. IDs de cartório, pesquisa, pergunta e avaliação não aparecem na URL. Códigos antigos preservados em `public_slug` continuam resolvendo materiais já impressos.

Em produção, configure `VITE_PUBLIC_APP_URL` com uma origem HTTPS, sem caminho, query, fragmento ou barra final. Sem essa variável, o navegador usa sua origem atual. A configuração HTTPS publicada não pôde ser comprovada neste ambiente e permanece ressalva operacional.

Esta etapa não grava tags, não gerencia hardware NFC e não cria funcionalidades posteriores.
