# Etapa 4 — Migração administrativa para dados reais

## Objetivo
Migrar exclusivamente Cartório, Usuários, Pontos de avaliação e Pesquisas/Perguntas/Opções para o Supabase conectado, mantendo avaliações, indicadores, relatórios, ocorrências e planos em mocks nesta etapa.

## Fase 0 — Base de acesso
- Criar uma camada tipada de funções autenticadas para todas as leituras e mutações, usando a sessão real e deixando a RLS definir o cartório atual.
- Criar mapeadores entre os campos do banco e os tipos já usados pelas telas.
- Criar consultas e mutações com cache e invalidação, sem espalhar chamadas ao Supabase pelos componentes.
- Padronizar estados de carregamento, vazio, erro, sem permissão, sessão expirada, perfil ausente e registro inexistente.

## Bloco 1 — Cartório
- Buscar o cartório real associado ao usuário autenticado, sem ID fixo ou dado mockado.
- Exibir os dados reais e conectar a edição somente dos campos administrativos permitidos.
- Manter ID, tenant, status, plano e demais campos internos fora da alteração comum.
- Validar leitura, edição, persistência após recarga e bloqueio cruzado com dois tenants antes de avançar.

## Bloco 2 — Usuários
- Substituir as duas listas atuais por uma única listagem real com nome, e-mail, telefone, perfil, status e situação do acesso.
- Criar usuário funcional e convite Auth por função autenticada; usar o cliente privilegiado apenas após autorização RLS e de papel no servidor.
- Conectar edição de nome, telefone, papel permitido e status; impedir troca de tenant e promoção a `PLATFORM_ADMIN`.
- Manter desativação em vez de exclusão física.
- Validar criação, convite/autenticação, edição, status, persistência, isolamento e ausência de segredo no navegador.

## Bloco 3 — Pontos de avaliação
- Listar, criar e editar pontos reais vinculados automaticamente ao cartório e a uma pesquisa real do mesmo tenant.
- Conectar ativação/inativação e manter exclusão física fora do fluxo.
- Remover do módulo textos e ações que indiquem persistência apenas demonstrativa; não implementar QR Code, NFC ou avaliação pública real.
- Validar CRUD administrativo, persistência e tentativas de troca de cartório/pesquisa entre tenants.

## Bloco 4 — Pesquisas, perguntas e opções
- Conectar pesquisas reais com criação, edição, duplicação, status e configurações existentes.
- Conectar perguntas, condições, ordem e ativação; persistir opções em `opcoes_resposta` em vez de arrays locais.
- Fazer duplicação de pesquisa/pergunta e reordenação preservarem toda a hierarquia.
- Validar obrigatórios, relações do mesmo tenant, persistência após recarga e logout/login, e bloqueios cruzados por ID.

## Limpeza e integração
- Retirar mocks somente como fonte dos quatro módulos migrados; preservar os mocks dos módulos ainda fora da Etapa 4.
- Evitar que dados reais desses módulos alterem prematuramente avaliações, indicadores e relatórios ainda demonstrativos.
- Atualizar contratos, documentação técnica, relatório da Etapa 4, decisões arquiteturais e roteiro do projeto.

## Validação final
- Executar cada bloco na ordem: implementar, testar, corrigir, repetir e somente então avançar.
- Exercitar o fluxo real pela interface com sessão autenticada, incluindo recarga e novo login.
- Executar testes diretos com Tenant A e Tenant B para leitura, criação, edição, status, IDs cruzados, troca de tenant e elevação de privilégio.
- Confirmar TypeScript, compilação, erros de execução e ausência de `service_role` em código enviado ao navegador.
- Preencher a matriz final apenas com evidências reais e classificar a etapa como APROVADA, APROVADA COM RESSALVAS ou REPROVADA.

## Detalhes técnicos
- As páginas protegidas continuarão sob o layout autenticado existente.
- Funções internas usarão `createServerFn` com `requireSupabaseAuth`; leituras e mutações comuns usarão `context.supabase` para respeitar RLS.
- O cliente administrativo será carregado dinamicamente apenas no fluxo de convite, depois da autorização do solicitante.
- TanStack Query controlará cache, estados e invalidação; nenhum dado persistente será mantido em `localStorage` ou no provider de sessão.
- Nenhuma alteração abrirá acesso anônimo nem iniciará a Etapa 5.
