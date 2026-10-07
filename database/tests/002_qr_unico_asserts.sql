-- Verificações do QR Code único (spec 2026-10-07). Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261008010000>; <migração 20261008020000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _other uuid := (select id from public.cartorios where id <> '10000000-0000-4000-8000-000000000001' limit 1);
  _admin_claims text := json_build_object('role','authenticated','sub','d92c734a-9305-4b68-b7cc-67419eb52337')::text;
  _q uuid; _p uuid; _n int; _before int; _svc uuid; _svc_other uuid; _r jsonb; _ans jsonb;
begin
  -- a) toda pesquisa tem as 6 essenciais, com a geral na ordem 1
  if exists (select 1 from public.pesquisas p where (select count(*) from public.perguntas q where q.pesquisa_id = p.id and q.chave_essencial is not null) <> 6) then
    raise exception 'FALHA a: pesquisa sem 6 essenciais';
  end if;
  if exists (select 1 from public.perguntas where chave_essencial = 'overall' and ordem <> 1) then raise exception 'FALHA a2: geral fora da ordem 1'; end if;

  -- b–e) cliente autenticado não altera a estrutura de uma essencial
  perform set_config('request.jwt.claims', _admin_claims, true);
  select q.id into _q from public.perguntas q join public.pesquisas p on p.id = q.pesquisa_id where p.cartorio_id = _demo and q.chave_essencial = 'time' limit 1;
  begin update public.perguntas set ativa = false where id = _q; raise exception 'FALHA b: desativou essencial';
  exception when others then if sqlerrm <> 'essential_question_locked' then raise; end if; end;
  update public.perguntas set texto = texto || ' ' where id = _q; -- c) texto pode mudar
  begin delete from public.perguntas where id = _q; raise exception 'FALHA d: apagou essencial';
  exception when others then if sqlerrm <> 'essential_question_locked' then raise; end if; end;
  begin
    insert into public.perguntas(pesquisa_id, texto, tipo, ordem, obrigatoria, ativa, dimensao, chave_essencial)
    select pesquisa_id, 'x', 'scale', 999, false, true, 'time', 'time' from public.perguntas where id = _q;
    raise exception 'FALHA e: criou essencial';
  exception when others then if sqlerrm <> 'essential_question_locked' then raise; end if; end;

  -- f) pesquisa nova nasce com 8 perguntas
  insert into public.pesquisas(cartorio_id, nome, status, versao, configuracoes) values (_demo, 'Dry run', 'rascunho', '1.0', '{}') returning id into _p;
  select count(*) into _n from public.perguntas where pesquisa_id = _p;
  if _n <> 8 then raise exception 'FALHA f: pesquisa nova com % perguntas', _n; end if;

  -- g) atribuições
  begin perform public.set_registry_attributions('{}'); raise exception 'FALHA g: aceitou zero atribuições';
  exception when others then if sqlerrm <> 'attributions_required' then raise; end if; end;
  perform public.set_registry_attributions(array['notas', 'civil_pn']);
  select count(*) into _n from public.servicos_cartorio where cartorio_id = _demo;
  if _n <> 12 then raise exception 'FALHA g2: % serviços criados (esperado 12)', _n; end if;

  -- h) contexto público traz razão social e serviços
  perform set_config('request.jwt.claims', '', true);
  _r := public.get_public_evaluation_context('CQ-BAL-001');
  if jsonb_array_length(_r -> 'services') <> 12 then raise exception 'FALHA h: % serviços no contexto', jsonb_array_length(_r -> 'services'); end if;
  if coalesce(_r ->> 'registryOfficialName', '') = '' then raise exception 'FALHA h2: sem razão social'; end if;

  -- respostas válidas para as perguntas obrigatórias do DEMO
  select jsonb_object_agg(q.id::text, case when q.tipo in ('stars', 'scale') then to_jsonb(5) else to_jsonb('sim'::text) end) into _ans
  from public.perguntas q join public.pontos_avaliacao pt on pt.pesquisa_id = q.pesquisa_id
  where pt.codigo = 'CQ-BAL-001' and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');

  -- i) serviço de outro cartório é recusado
  insert into public.servicos_cartorio(cartorio_id, catalogo_chave, atribuicao, nome, ordem) values (_other, 'notas.escritura', 'notas', 'Escritura', 3) returning id into _svc_other;
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, _svc_other, false);
    raise exception 'FALHA i: aceitou serviço de outro cartório';
  exception when others then if sqlerrm <> 'service_unavailable' then raise; end if; end;

  -- j) serviço válido é gravado
  select id into _svc from public.servicos_cartorio where cartorio_id = _demo and catalogo_chave = 'notas.escritura';
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, _svc, false);
  if (select count(*) from public.avaliacoes where servico_id = _svc) <> 1 then raise exception 'FALHA j: serviço não gravado'; end if;

  -- k) sem serviço, com vários ativos: grava vazio; "Outro serviço" grava a marcação
  select count(*) into _before from public.avaliacoes where cartorio_id = _demo and servico_id is null;
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, null, false);
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, null, true);
  if (select count(*) from public.avaliacoes where cartorio_id = _demo and servico_id is null) <> _before + 2 then raise exception 'FALHA k: envio sem serviço'; end if;
  if not exists (select 1 from public.avaliacoes where cartorio_id = _demo and servico_outro) then raise exception 'FALHA k2: outro serviço não marcado'; end if;

  -- l) serviço inativo é recusado
  perform set_config('request.jwt.claims', _admin_claims, true);
  perform public.set_registry_service_active(_svc, false);
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, _svc, false);
    raise exception 'FALHA l: aceitou serviço inativo';
  exception when others then if sqlerrm <> 'service_unavailable' then raise; end if; end;

  -- m) um único serviço ativo é gravado sozinho
  update public.servicos_cartorio set ativo = (catalogo_chave = 'civil_pn.nascimento') where cartorio_id = _demo;
  select id into _svc from public.servicos_cartorio where cartorio_id = _demo and catalogo_chave = 'civil_pn.nascimento';
  perform public.submit_public_evaluation('CQ-BAL-001', gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans, '{}'::jsonb, null, false);
  if (select count(*) from public.avaliacoes where servico_id = _svc) <> 1 then raise exception 'FALHA m: serviço único não gravado'; end if;

  -- n) desmarcar a atribuição não some com o histórico no painel
  perform set_config('request.jwt.claims', _admin_claims, true);
  perform public.set_registry_attributions(array['civil_pn']);
  _r := public.get_dashboard_indicators(now() - interval '1 day', now() + interval '1 day', now() - interval '3 days', now() - interval '1 day', null, null, 'day', null);
  if not exists (select 1 from jsonb_array_elements(_r -> 'services') s where s ->> 'name' = 'Escritura' and (s ->> 'total')::int >= 1) then
    raise exception 'FALHA n: serviço desmarcado sumiu do painel';
  end if;
  if not exists (select 1 from jsonb_array_elements(_r -> 'dimensions') d where d ->> 'label' = 'Cordialidade') then raise exception 'FALHA n2: rótulo Cordialidade'; end if;

  -- o) filtro por serviço no painel
  _r := public.get_dashboard_indicators(now() - interval '1 day', now() + interval '1 day', now() - interval '3 days', now() - interval '1 day', null, null, 'day', _svc);
  if (_r -> 'summary' ->> 'total')::int <> 1 then raise exception 'FALHA o: filtro por serviço (total %)', _r -> 'summary' ->> 'total'; end if;

  raise exception 'DRY_RUN_OK: todas as verificações passaram (nada foi gravado)';
end $$;
