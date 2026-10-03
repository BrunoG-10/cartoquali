# Etapa 6 — Fluxo público de avaliação

## Objetivo
Conectar a jornada pública mobile ao Supabase real, do código do ponto até a confirmação e a leitura administrativa, sem login e sem iniciar a Etapa 7.

## Implementação
1. Manter `public_slug` como identificador público opaco e adotar `/avaliar/:codigo` como rota canônica, preservando redirecionamento compatível para os links antigos.
2. Criar uma leitura pública mínima que devolva somente nome do cartório/ponto, configuração da pesquisa ativa, perguntas ativas e opções necessárias.
3. Criar uma operação transacional de envio que resolve ponto, cartório e pesquisa no servidor; valida respostas, condições, opções, obrigatoriedade, contato e nota; grava avaliação e respostas juntas.
4. Proteger o envio contra repetição acidental com uma chave idempotente curta e limitar abuso básico por origem, sem CAPTCHA obrigatório.
5. Adaptar o formulário existente para os dados reais, estados específicos, anonimato padrão, contato voluntário, retry seguro e experiência em telas de 320–430 px.
6. Exibir e copiar a URL pública na página administrativa de Pontos de avaliação.
7. Remover somente as dependências mock do fluxo público e documentar arquitetura, políticas, validações, erros e limitações.

## Segurança
- As tabelas administrativas continuam sem leitura pública direta; visitantes não poderão listar avaliações, respostas, cartórios ou configurações.
- O navegador enviará apenas o código público, respostas e contato opcional; IDs internos e relações serão determinados e validados no servidor.
- A operação pública terá projeção mínima, limites de tamanho e frequência, e não devolverá o ID da avaliação.
- Avaliações e respostas permanecem imutáveis após o envio.

## Validação
- Matriz real com dois cartórios, ponto inexistente/inativo e pesquisa indisponível.
- Testes de manipulação cruzada, opções incompatíveis, obrigatórias ausentes, leitura/alteração anônima e ausência de segredos no navegador.
- Testes de duplo clique, repetição, falha/retry, persistência e exibição no módulo administrativo.
- Verificação visual em 320, 360, 390, 414 e 430 px, além de compilação, linter e tempos/quantidade de chamadas.
- Relatório final com a matriz de 19 itens e confirmação explícita de que a Etapa 7 não foi iniciada.
