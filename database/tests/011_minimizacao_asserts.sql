-- Minimização LGPD de uma avaliação com texto livre no "Outro". Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261016010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _melhoria uuid;
  _ans jsonb;
  _eval uuid;
  _req uuid;
  _redacted constant text := '[Conteúdo redigido por solicitação de privacidade]';
begin
  perform set_config('request.jwt.claims', '', true);
  select q.id into _melhoria
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.tipo = 'multiple_choice' and q.dimensao = 'comment' and q.ativa limit 1;
  select jsonb_object_agg(q.id::text,
           case when q.chave_essencial = 'overall' then to_jsonb(1)
                when q.tipo in ('stars', 'scale') then to_jsonb(2)
                else to_jsonb('sim'::text) end)
    into _ans
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');

  -- avaliação com "Outro: Maria da Silva, CPF 000" e pedido de contato
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text),
    _ans || jsonb_build_object(_melhoria::text, jsonb_build_object('values', jsonb_build_array('Outro'), 'other', 'Maria da Silva, CPF 000')),
    jsonb_build_object('requested', true, 'name', 'Maria', 'phone', '86999990000', 'consent', true), null, false);
  select id into _eval from public.avaliacoes where cartorio_id = _demo order by created_at desc limit 1;

  insert into public.privacy_requests (cartorio_id, request_type, description, evaluation_id, created_by_id)
  values (_demo, 'eliminacao', 'Pedido de eliminação no teste', _eval, _admin) returning id into _req;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';
  perform public.minimize_evaluation_personal_data(_eval, _req, true);
  execute 'reset role';

  -- a) o texto do "Outro" foi redigido; as opções marcadas continuam
  if exists (select 1 from public.respostas where avaliacao_id = _eval and pergunta_id = _melhoria
             and resposta_texto is distinct from _redacted) then
    raise exception 'FALHA a: texto do Outro não foi redigido';
  end if;
  if (select valor from public.respostas where avaliacao_id = _eval and pergunta_id = _melhoria) <> jsonb_build_array('Outro') then
    raise exception 'FALHA a2: opções marcadas foram alteradas';
  end if;
  -- b) motivo (que repetia o texto) e contato removidos
  if (select motivo_insatisfacao from public.avaliacoes where id = _eval) is not null then
    raise exception 'FALHA b: motivo de insatisfação permaneceu';
  end if;
  if exists (select 1 from public.evaluation_contacts where evaluation_id = _eval) then
    raise exception 'FALHA b2: contato permaneceu';
  end if;
  -- c) nenhuma avaliação minimizada guarda texto livre em seleção múltipla
  if exists (select 1 from public.respostas r join public.perguntas q on q.id = r.pergunta_id
             join public.avaliacoes a on a.id = r.avaliacao_id
             where a.minimized_at is not null and q.tipo = 'multiple_choice'
               and r.resposta_texto is not null and r.resposta_texto <> _redacted) then
    raise exception 'FALHA c: avaliação minimizada ainda com texto livre';
  end if;

  raise exception 'DRY_RUN_OK: minimização (a-c passaram, nada foi gravado)';
end $$;
