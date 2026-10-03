# Fluxo público de avaliação

## Acesso

O endereço canônico é `/avaliar/{public_slug}`. O identificador público pertence ao ponto de avaliação e não revela IDs internos. A rota é pública e não exige conta.

## Leitura

`getPublicEvaluation` chama `get_public_evaluation_context` no servidor. A função retorna somente nome do cartório, ponto, pesquisa, configurações públicas, perguntas ativas e opções. As tabelas continuam sem leitura anônima direta.

Estados previstos: carregando, falha de conexão, ponto inexistente, ponto inativo, pesquisa indisponível e pesquisa pronta.

## Envio

`submitPublicEvaluation` calcula no servidor uma impressão SHA-256 da origem e chama `submit_public_evaluation`. A operação valida ponto, cartório, pesquisa, perguntas, obrigatoriedade, condições, tipos e contato antes de inserir avaliação e respostas na mesma transação.

- Avaliação anônima por padrão.
- Contato opcional, com consentimento e validação.
- Chave idempotente por tentativa na sessão do navegador.
- Clique duplo bloqueado na interface e duplicidade rejeitada no banco.
- Limite de 8 envios por origem em 10 minutos.
- Nenhuma chave privilegiada chega ao navegador.
- Avaliações persistidas permanecem imutáveis para clientes.

## Segurança e isolamento

Usuários anônimos não podem listar, consultar, alterar ou excluir avaliações e respostas. As duas funções públicas do banco aceitam execução somente pelo serviço do servidor. O contexto é resolvido pelo código do ponto e o envio verifica todas as relações no banco, impedindo combinações entre cartórios.

## Operação administrativa

Na página Pontos de avaliação, “Copiar link” gera o endereço canônico e “Abrir” permite conferir a experiência pública. As avaliações registradas aparecem no módulo administrativo já migrado na Etapa 5, conforme as permissões do usuário.

## Validação da Etapa 6

Classificação: **APROVADA COM RESSALVAS**.

1. Código válido carrega o ponto e cinco perguntas reais: aprovado.
2. Código inexistente apresenta mensagem específica: aprovado.
3. Ponto inativo e pesquisa indisponível têm estados separados: aprovado pela operação do banco e apresentação.
4. Envio completo salva avaliação e respostas atomicamente: aprovado.
5. Relações incompatíveis são rejeitadas pelas chaves e validações; a execução pública com dois cartórios ficou pendente porque o banco atual possui somente o cartório DEMO: aprovado com ressalvas.
6. Leitura pública direta de avaliações e respostas permanece bloqueada: aprovado.
7. Alteração e exclusão públicas permanecem bloqueadas: aprovado.
8. Identificador interno e segredo do serviço não são enviados ao navegador: aprovado.
9. Anonimato padrão: aprovado.
10. Contato opcional com consentimento: aprovado.
11. Perguntas condicionais e obrigatórias validadas no servidor: aprovado.
12. Clique duplo e repetição com a mesma chave são idempotentes: aprovado.
13. Nova tentativa preserva a chave até sucesso: aprovado.
14. Limite de abuso por origem: aprovado.
15. Link copiável no cadastro de pontos: aprovado.
16. Celulares de 320, 390 e 430 px sem rolagem horizontal: aprovado.
17. Fluxo completo no navegador até “Obrigado pela sua avaliação.”: aprovado.
18. Registro persistido e compatível com a consulta do módulo administrativo da Etapa 5: aprovado; a abertura visual autenticada ficou sem uma sessão injetada nesta execução.
19. Compilação e verificação de tipos: aprovado.

## Escopo

A Etapa 7 não foi iniciada. Dashboard definitivo, indicadores reais, relatórios finais, automações de qualidade, notificações, pagamentos, IA, NFC físico avançado e integrações externas continuam fora deste trabalho.