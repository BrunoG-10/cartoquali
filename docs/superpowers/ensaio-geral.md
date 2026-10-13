# Ensaio geral — registro de execução (produção, cartoquali.com.br)

Início: 13/10/2026. Papéis:
- Administrador da plataforma: bg600070@gmail.com (DEMO) — implantação, painel da plataforma, cobrança.
- Administrador do cartório piloto: cartoquali@gmail.com.
- Gestor → operador → desativado: bruno_gabriel1@outlook.com.br.
- Cartório: "Cartório Piloto (ensaio)", CNPJ de teste 00.000.000/0001-91, Teresina/PI.

Legenda: ✅ passou · ❌ falhou · ⚠️ observação/ajuste.

## Fase A — Implantação (administrador da plataforma)

- ✅ Formulário "Novo cartório": botão "Criar e continuar" desativado com campos vazios.
- ⚠️ Sem indicação de quais campos faltam enquanto o botão está desativado.
- ✅ Etapa 1: cartório criado (Teresina/PI · 00000000000191), "Etapa 2 de 8".
- ⚠️ Após "Criar e continuar", volta para a lista em vez de abrir a etapa 2 (precisa clicar em "Continuar implantação").
- ⚠️ Acessibilidade: botões das 8 etapas e campos da etapa 2 sem nome acessível.
- ✅ Etapa 2: convite enviado para cartoquali@gmail.com ("Etapa atualizada com sucesso").
- ❌ Etapa 3: "Não foi possível salvar a pesquisa." Causa: save_onboarding_survey (reescrita no QR único)
  grava audit_logs com o usuário do administrador da plataforma (DEMO) num cartório novo; a FK
  (user_id, cartorio_id) recusa. Correção: migração 20261015010000 + teste 010 (8 etapas). PR #33.
- ✅ Etapa 3 (após correção): pesquisa salva com 8 perguntas modelo.
- ⚠️ Ao reabrir, a implantação abriu na etapa 4 com a etapa 3 ainda pendente.
- ✅ Etapa 4: "Validar e publicar" publicou a pesquisa.
- ⚠️ "Revisar perguntas" leva a /pesquisas, que mostra as pesquisas do DEMO (cartório do administrador da plataforma), não as do piloto.
- ✅ Etapa 5: ponto "Atendimento principal / Balcão de atendimento" salvo.
- ✅ Etapa 6: QR gerado — https://cartoquali.com.br/avaliar/CQ-80A271DF3B.
- ⚠️ Botão "Copiar" sem retorno visual ("Copiado").
- ⚠️ Antes da ativação o link público diz "Este QR Code não está mais em uso." (deveria dizer que ainda não está disponível).
- ✅ Etapa 7: "Preparar teste" → link com ?teste=…; serviços listados conforme atribuições (Notas + Registro Civil);
  "Continuar" bloqueado sem resposta obrigatória; 7 perguntas (melhoria oculta com nota 5); sem opção de contato no teste;
  envio → "Teste concluído. Retorne à implantação para revisar e ativar."
- ⚠️ A página de teste não indica visualmente que é um teste; o serviço escolhido não é gravado na avaliação de teste.
- ✅ Etapa 8: checklist completo → "Ativar cartório" → cartório ativo, botão vira "Desativar".
- ⚠️ Confirmação genérica ("Etapa atualizada com sucesso") em vez de "Cartório ativado".
- ✅ Banco: cartório ativo; avaliação de teste com is_test (fora dos números); admin cartoquali@gmail.com CARTORIO_ADMIN
  com login criado pelo convite; 46 registros de auditoria, todos com o administrador em platform_actor_id.
- ✅ Link público após ativação abre a pesquisa do piloto.

## Fase B — Primeiro acesso do administrador do cartório

- ✅ E-mail "Seu acesso ao CartoQuali" chegou na caixa de entrada (remetente nao-responda@cartoquali.com.br).
- ✅ Link abriu "Crie sua senha de acesso" (`/reset-password?origem=convite`); senha criada; entrou no Painel.
- ✅ Link de redefinição antigo (já usado) mostra "Este link expirou ou já foi usado".
- ⚠️ O Chrome preencheu a senha salva no campo "Nova senha" (faltava `autocomplete="new-password"`).
- ✅ Abertura do guia apareceu; "Continuar depois" adiou; menu sem "Plataforma"; cartão do usuário correto.
- ✅ Painel vazio: a avaliação de teste da implantação não entrou nos números.

## Fase C — Telas do administrador do cartório

- ✅ Tour completo pelo "?": 9 páginas, encerra em "Tudo pronto!".
- ✅ As 14 páginas do cartório abrem sem erro, com dados só do piloto.
- ✅ As 13 páginas cabem em 375 px (sem rolagem lateral).
- ⚠️ "dados atualizados do Supabase" (nome de fornecedor) nos relatórios/Visão executiva.
- ✅ Usuários: convite de gestor enviado ("Usuário criado e convite enviado"); e-mail duplicado recusado ("Este e-mail já está em uso.").
- ⚠️ Convidado que ainda não aceitou aparece como "Acesso autenticado disponível".
- ✅ Pesquisas: perguntas essenciais sem "Desativar"; tipo/dimensão travados na edição.
- ❌ Editar o texto da pergunta 1 (Satisfação geral) falhava (dimensão `overall` fora da validação); o mesmo
  para as perguntas 7/8 (`comment`); pergunta nova nascia com `general`, recusada pelo banco.
- ✅ QR Code: cartaz com nome, código e link; PNG 1200 px; "Imprimir cartaz" e "Baixar PNG" funcionam.
- ✅ Cartório: dados salvos. Observação: o cliente pode alterar CNPJ e razão social (decidir se deve ser só leitura).
- ✅ Configurações: salvas (mensagem de agradecimento).
- ✅ Auditoria: ações em português, com autor e horário.
- ⚠️ O filtro de ações da auditoria do cartório listava ações de cobrança da plataforma.

## Fase D — Avaliação pública (celular)

- ✅ Três avaliações feitas no celular, "fluido e sem erro". Banco: Casamento nota 5; Escritura nota 1 com
  "Tempo de espera, Outro: teste" e pedido de retorno (contato só na tabela protegida); nota 3 com "Nada a melhorar".

## Fase E — Tratamento: alertas, retorno, ocorrência, plano, relatórios

- ✅ Painel: faixa vermelha (nota 1/2) e amarela (retorno), número "1" no menu; indicadores corretos (3 avaliações, nota 3,0, 33,3%).
- ✅ Detalhe da avaliação: respostas, "Outro: teste", contato visível ao administrador.
- ⚠️ Telefone sem formatação ("86999999999").
- ✅ Ocorrência criada a partir da avaliação (pré-preenchida), com histórico e avaliação de origem.
- ❌ Editar a ocorrência falhava sempre ("Invalid datetime … expectedUpdatedAt", erro técnico na tela).
- ✅ Plano criado a partir da ocorrência; editado (Em andamento, 50%); conclusão bloqueada sem resultado;
  concluído com resultado e travado para histórico.
- ⚠️ Plano concluído não mostrava o indicador antes/depois.
- ✅ "Retorno feito" → faixas e número do menu somem.
- ✅ 7 relatórios abrem; nenhum mostra contato; "Imprimir" chama a impressão; CSV sem contato.
- ⚠️ Relatórios com ponto decimal ("3.0/5", "33.3%") e "1 estrelas".
- ⚠️ CSV: separador vírgula (Excel pt-BR abre numa coluna), data UTC técnica, situação em código, sem proteção contra fórmulas.
- ✅ Privacidade: solicitação registrada e tratada; "Minimizar dados" removeu contato, comentário e motivo.
- ❌ A minimização mantinha o texto livre do "Outro" (dado pessoal possível).
- ⚠️ "Avaliação relacionada" pedia o UUID; plurais "1 ocorrências", "1 planos", "1 solicitações".

## Fase F — Perfis: gestor, operador, desativação

Pendente (depende do acesso de bruno_gabriel1@outlook.com.br).

## Fase G — Plataforma: painel, cobrança, isolamento

- ✅ Isolamento (auditoria no Supabase, 13/10/2026): `ISOLAMENTO_OK` — 12 tabelas com `cartorio_id`
  testadas nos dois sentidos (DEMO x Cartório Piloto (ensaio)); nenhuma função liberada ao anônimo.
  A primeira rodada apontou que o administrador do DEMO lê `cartorio_onboarding` do piloto: é o
  acesso previsto do administrador da plataforma (tela Implantação). O teste 006 agora separa os
  dois casos: como plataforma só a implantação aparece; sem o perfil de plataforma, nada (PR #39).
- Painel e cobrança: pendente (depende do login de bg600070@gmail.com).

## Achados e correções

| Achado | Correção |
|---|---|
| ❌ Etapa 3 da implantação falhava para todo cartório novo | PR #33 (migração + teste 010) — mesclado |
| ❌ Edição de ocorrência sempre falhava | PR #34 (`dbTimestamp`) — mesclado |
| ⚠️ Erros técnicos (JSON) na tela | PR #34 (`userMessage` em 13 telas) — mesclado |
| ❌ Pesquisas: editar pergunta 1/7/8 e criar pergunta | PR #36 (`question-dimensions`) — mesclado |
| ❌ Minimização não apagava o texto do "Outro" | PR #35 (migração + teste 011) — dry run OK, mesclado |
| ⚠️ CSV, números, plurais, telefone, textos, implantação, privacidade, auditoria, senha | PR #36 — mesclado |
| ⚠️ "Acesso autenticado disponível" para convite pendente | PR #38 (último acesso real + "Reenviar acesso") — mesclado e conferido em produção |
| ❌ Convite vence em 24 h sem forma de reenviar | PR #38 — mesclado; reenvio ao gestor conferido em produção |
| ⚠️ Serviço não gravado na avaliação de teste | Não corrigido (só afeta o teste da implantação) |
| Observação: cliente pode alterar CNPJ | Decisão do responsável |
