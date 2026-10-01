# Corrigir o provedor de sessão ausente

## Implementação
- Padronizar todas as importações do contexto de sessão pelo mesmo caminho absoluto usado na raiz.
- Preservar o estado em memória e todas as funcionalidades existentes.
- Verificar a página inicial e as demais telas dependentes no navegador, incluindo erros de console.

## Detalhes técnicos
- A falha ocorre porque caminhos relativos e absolutos podem criar duas instâncias do módulo durante atualização em desenvolvimento; o consumidor consulta um contexto diferente daquele fornecido pela raiz.
- Não haverá banco de dados nem alteração na lógica de negócio.
