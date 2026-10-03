# Etapa 14 — Hardening do fluxo público de avaliação

## Objetivo

Endurecer exclusivamente a jornada pública `QR/NFC → /avaliar/:codigo → pesquisa ativa → envio → confirmação`, preservando o que já funciona e sem iniciar onboarding, novos módulos ou recursos comerciais.

## Auditoria concluída

- A rota pública já usa código opaco, carrega somente o contexto mínimo e envia por funções de servidor para duas RPCs executáveis apenas por `service_role`.
- O banco já valida ponto, cartório, pesquisa, perguntas, opções, obrigatoriedade, condições e escala; grava avaliação e respostas na mesma transação.
- Idempotência por UUID, bloqueio de clique duplo, retry com a mesma chave, limite de payload e contato separado já existem.
- O fluxo inicial abriu sem erros ou rolagem horizontal em 320, 360, 390 e 430 px.
- Permanecem pontos de hardening: mensagens exigidas para inatividade/indisponibilidade, estados de finalização mais claros, acessibilidade do questionário, navegação voltar/refresh, limites completos do envelope, cache explícito, rate limit menos prejudicial a redes compartilhadas, teste de XSS e falhas de rede, validação da URL de produção e matriz real com dois cartórios.
- O alerta preexistente do Supabase sobre proteção contra senhas vazadas não pertence ao fluxo público e será apenas registrado.

## Implementação

1. **Jornada e resiliência**
   - Ajustar textos seguros de ponto inexistente, ponto inativo e pesquisa indisponível.
   - Separar os estados de carregamento, envio e finalização; manter a chave idempotente até confirmação real.
   - Tornar voltar/refresh previsíveis sem restaurar dados pessoais nem exibir sucesso sem persistência.
   - Manter contato opcional e a jornada positiva curta; perguntas condicionais continuam dirigidas pela pesquisa.

2. **Mobile e acessibilidade**
   - Revisar questionário para foco visível, labels e instruções para leitor de tela, progresso sem depender de cor e áreas de toque adequadas.
   - Garantir estabilidade em 320, 360, 390 e 430 px, modo retrato e teclado móvel, sem rolagem horizontal.
   - Respeitar redução de movimento e manter a jornada essencial utilizável por teclado.

3. **Segurança do envio público**
   - Reforçar o esquema de entrada com limite da quantidade de respostas, chaves, arrays e tamanho total antes da RPC.
   - Revisar o rate limit para proteger o endpoint sem tratar o IP como identidade nem bloquear clientes legítimos na mesma rede.
   - Manter validação relacional e transacional no banco, RPCs privadas, avaliações imutáveis e ausência de leitura pública administrativa.
   - Definir respostas e cache seguros para contexto público e submissões; nenhum contato, resposta ou dado administrativo será armazenado em cache.
   - Confirmar que comentários são sempre tratados como texto e testar HTML, script, URL, caracteres especiais, emojis e quebras de linha.

4. **QR, URL e NFC**
   - Validar `VITE_PUBLIC_APP_URL` como origem HTTPS configurável em produção, sem `localhost` ou URL temporária em material gerado.
   - Confirmar que QR e futura gravação NFC usam exatamente a mesma URL canônica e continuam válidos quando a pesquisa muda ou o ponto é reativado.

5. **Testes reais e limpeza**
   - Exercitar o fluxo completo e persistência, duplo clique, mesma chave, retry após falha incerta, timeout, erro 500, resposta incompleta, refresh e voltar.
   - Executar manipulação de código, IDs, perguntas, opções, nota, papel e cartório; confirmar isolamento e bloqueio de leitura/alteração pública.
   - Criar fixtures temporárias de dois cartórios para códigos válidos, inexistente, inativo, pesquisa despublicada, troca de pesquisa e reativação; remover tudo ao final.
   - Simular submissões legítimas concorrentes, conferir ausência de duplicidade e atualização dos agregados.
   - Medir requests, tempo de resposta e peso da página; validar navegador móvel emulado e registrar como ressalva qualquer teste físico Android/iPhone/QR que não possa ser executado aqui.

6. **Documentação e encerramento**
   - Criar `PUBLIC_EVALUATION.md`, `PUBLIC_API_SECURITY.md`, `QR_NFC_FLOW.md` e `PUBLIC_FLOW_TESTS.md`.
   - Atualizar documentação de segurança, arquitetura e roadmap somente com evidências verificadas.
   - Publicar a matriz final e classificar a etapa conforme os resultados reais; não iniciar a etapa seguinte.

## Critérios de conclusão

- Fluxo público real completo, responsivo e acessível, sem duplicidade conhecida.
- Validação e integridade confirmadas no servidor e no banco, com isolamento entre dois cartórios.
- QR usa origem pública adequada; ponto inativo, reativação e pesquisa dinâmica funcionam sem gerar novo QR.
- Falhas de conexão permitem retry seguro sem criar uma segunda avaliação.
- Nenhum segredo, ID interno, contato, avaliação existente ou dado administrativo é exposto.
- TypeScript, build, linter, testes de navegador e matriz da Etapa 14 concluídos; limitações físicas/operacionais explicitadas.