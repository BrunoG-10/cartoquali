# Regras de negócio do CartoQuali

## Avaliação pública

- É anônima por padrão e não exige cadastro.
- O cartório e o ponto devem corresponder aos slugs da URL e estar ativos.
- Contato é opcional. Quando solicitado, exige nome, telefone ou e-mail e consentimento.
- CPF, RG e endereço não são coletados.
- Avaliações de 1 a 3 estrelas são negativas e podem registrar motivos de melhoria.

## Indicadores

- Nota média: soma das notas dividida pelas avaliações válidas.
- Satisfação: notas 4 e 5 divididas pelas avaliações válidas, em percentual.
- Taxa negativa: notas 1 a 3 divididas pelas avaliações válidas, em percentual.
- Quantidade negativa: número absoluto de avaliações com notas 1 a 3.
- Resolutividade: respostas “Sim” divididas pelas respostas válidas de resolução, em percentual.
- Dimensões: médias das respostas numéricas vinculadas às perguntas configuradas, normalizadas para 0–100.

## Períodos

O período anterior tem duração equivalente ao atual. Meses usam limites de calendário. O intervalo personalizado inclui as datas inicial e final.

## Ocorrências e planos

Ocorrências podem nascer de uma avaliação e manter histórico. Planos podem ser associados a ocorrências, responsáveis, prazo, progresso e evidências antes/depois. Inativação é preferida quando a remoção prejudicaria vínculos históricos.

## Privacidade e isolamento

Listagens administrativas mostram apenas se houve solicitação de contato, sem expor telefone ou e-mail. Toda leitura ou alteração operacional deve validar `registryId`. Dados do MVP desaparecem ao recarregar.
