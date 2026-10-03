# Avaliação pública — Etapa 14

## Jornada

A rota canônica é `/avaliar/{codigo}` e não exige conta. Ela apresenta, nesta ordem, carregamento, abertura, perguntas condicionais, contato opcional, envio e confirmação. Código inexistente, ponto inativo, pesquisa indisponível e falha de rede possuem mensagens separadas e sem detalhes internos.

O contato não é necessário para avaliar. Quando solicitado, requer telefone ou e-mail e autorização específica; fica separado das respostas. Campos livres alertam para não incluir dados pessoais.

## Resiliência

- A chave de idempotência fica em `sessionStorage` durante a tentativa e é removida somente após confirmação.
- Repetir após resposta incerta reutiliza a chave e não duplica a avaliação.
- Duplo toque é bloqueado pelo estado de envio.
- Voltar entre perguntas preserva respostas visíveis; atualizar inicia novamente a interface, sem afirmar que uma tentativa não confirmada foi perdida.
- O contexto e o envio usam respostas `no-store`.

## Acessibilidade e dispositivos

Há rótulos para campos, progresso acessível, foco no título ao trocar de pergunta, áreas de toque de pelo menos 44 px, estados `aria-live`/`aria-busy` e respeito a movimento reduzido. A jornada foi inspecionada em 320, 360, 390 e 430 px, sem rolagem horizontal.

## Limites conhecidos

A URL HTTPS publicada depende de `VITE_PUBLIC_APP_URL`, ainda ausente no ambiente validado. Em desenvolvimento, `localhost` é aceito; em produção, valores sem HTTPS, com caminho, query ou fragmento são rejeitados. A Etapa 15 não foi iniciada.