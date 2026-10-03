# Evidências e matriz final — Etapa 14

Status: **APROVADA COM RESSALVAS OPERACIONAIS**.

| # | Verificação | Resultado |
|---:|---|---|
| 1 | Rota pública sem login | Aprovado |
| 2 | Código opaco sem IDs na URL | Aprovado |
| 3 | Contexto mínimo | Aprovado |
| 4 | Código inexistente | Aprovado |
| 5 | Ponto inativo | Aprovado |
| 6 | Pesquisa indisponível | Aprovado |
| 7 | Reativação preserva o endereço | Aprovado |
| 8 | Troca de pesquisa refletida pelo contexto | Aprovado |
| 9 | Isolamento entre dois cartórios | Aprovado |
| 10 | Pergunta cruzada entre tenants | Bloqueada |
| 11 | Obrigatoriedade e condições no servidor | Aprovado |
| 12 | Tipos e opções no servidor | Aprovado |
| 13 | Limite de 50 respostas | Aprovado |
| 14 | Limites de bytes, listas e textos | Aprovado |
| 15 | Gravação transacional | Aprovado |
| 16 | Repetição com a mesma chave | Aprovado, sem duplicar |
| 17 | Duplo toque no envio | Aprovado, uma chamada |
| 18 | Nove sessões independentes | Aprovado, sem bloqueio compartilhado |
| 19 | Retry após erro | Aprovado por chave preservada e mensagem segura |
| 20 | Contato opcional e separado | Aprovado |
| 21 | Cabeçalhos sem cache | Aprovado |
| 22 | Conteúdo semelhante a script | Aprovado, sem execução |
| 23 | Acessibilidade semântica | Aprovado |
| 24 | Larguras 320/360/390/430 px | Aprovado, sem overflow |
| 25 | Jornada completa em 390 px | Aprovado |
| 26 | Estado de conclusão | Aprovado visualmente |
| 27 | Tempo de abertura local | 1,8–3,0 s nas quatro medições |
| 28 | QR/link/cartaz compartilham URL | Aprovado por inspeção |
| 29 | Origem HTTPS de produção | Pendente de configuração |
| 30 | Sessão administrativa visual externa | Não disponível neste ambiente |
| 31 | Limpeza das fixtures | Aprovado por rollback transacional |

Os testes de banco usaram transações desfeitas ao final. O E2E real enviou uma avaliação pelo fluxo público e exibiu a confirmação sem erros de console. O alerta preexistente de proteção contra senhas vazadas do Supabase Auth não foi introduzido nesta etapa.

Nenhuma atividade da Etapa 15 foi iniciada.