# Privacidade por design — CartoQuali

## Princípios aplicados

- A avaliação pública não exige conta nem identificação no cadastro do CartoQuali.
- Nome, telefone e e-mail existem somente quando a pessoa solicita retorno e autoriza esse uso específico.
- O contato fica em `evaluation_contacts`, separado da avaliação e protegido por papel e tenant.
- Listas, indicadores, rankings, ocorrências, planos, relatórios operacionais e CSV não carregam contato.
- Comentários livres recebem aviso de minimização e podem ser redigidos por operação administrativa auditada.
- A minimização preserva nota, respostas estruturadas, volume e indicadores históricos.
- O identificador público é um slug opaco do ponto; IDs internos e `cartorio_id` não são usados na URL pública.

## Classificação operacional

| Classe | Exemplos | Acesso |
| --- | --- | --- |
| Público | nome do cartório e do ponto, pesquisa ativa, perguntas e opções | visitante com link público |
| Interno | indicadores, ocorrências, planos, configurações e auditoria | usuários autorizados do tenant |
| Pessoal | nome, telefone, e-mail e contato de solicitante | administradores autorizados |
| Potencialmente sensível em texto livre | comentário, descrição e observações inseridos livremente | acesso operacional restrito; minimizar quando necessário |

Esta classificação é técnica e não substitui avaliação jurídica do conteúdo concreto.

## Navegador e infraestrutura

O navegador guarda a sessão administrativa do Supabase e uma chave técnica temporária de idempotência da submissão em `sessionStorage`. Não há armazenamento de respostas ou contato no navegador, nem analytics adicional nesta etapa. O controle de abuso mantém apenas hash técnico temporário; IP e user-agent não são armazenados em claro pelo CartoQuali. Logs de infraestrutura podem existir, portanto não se promete anonimato absoluto.

## Limites

As medidas apoiam a conformidade, mas não tornam o produto, isoladamente, “100% adequado à LGPD”. Bases legais, prazos, canal formal, controlador, operador, encarregado e procedimentos organizacionais dependem de definição e revisão jurídica.