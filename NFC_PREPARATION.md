# Preparação para NFC

## Escopo desta etapa

A Etapa 11 prepara os pontos para uso futuro com NFC, mas não grava nem administra hardware. Link, QR Code e NFC devem compartilhar exatamente o mesmo endereço canônico do ponto: `https://dominio/avaliar/{CODIGO}`.

## Como preparar uma tag

1. Confirme que o ponto está ativo e vinculado à pesquisa correta.
2. Copie o link público na tela de Pontos de avaliação.
3. Grave a URL como um registro NDEF do tipo URI em ferramenta própria do fabricante.
4. Leia a tag em outro aparelho e confirme nome do ponto e pesquisa antes da instalação.
5. Bloqueie a tag para regravação somente depois da homologação operacional.

## Recomendações

- Use apenas HTTPS em produção.
- Não grave tokens, UUIDs internos, credenciais ou parâmetros de sessão.
- Use tags compatíveis com NDEF e capacidade suficiente para a URL.
- Posicione a tag com instrução visual e mantenha o QR Code como alternativa.
- Se o código canônico mudar, tags antigas continuam funcionando pelo slug legado; materiais novos devem usar o código atual.
- Ao retirar um ponto de operação, desative-o no sistema. Não exclua seu histórico.

## Fora do escopo

Gravação automática de tags, inventário de hardware, telemetria de aproximação, fornecedor oficial, provisionamento em massa e autenticação por NFC ficam para etapa futura explicitamente aprovada.
