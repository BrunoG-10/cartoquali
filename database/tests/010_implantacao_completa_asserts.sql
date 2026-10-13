-- Implantação completa (8 etapas) feita pelo administrador da plataforma, como na tela Implantações.
-- Rodar SEMPRE dentro do dry run: begin; <migração 20261015010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _admin uuid := (select id from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337');
  _c uuid;
  _r jsonb;
  _check jsonb;
  _code text;
  _token uuid;
  _ans jsonb;
  _n int;
  _step text;
begin
  if _admin is null then raise exception 'FALHA pré: administrador da plataforma não encontrado'; end if;
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';

  _step := '1 cartório';
  _r := public.onboarding_create_cartorio_onboarding(gen_random_uuid(), 'Ensaio Regressão Ltda', 'Ensaio Regressão',
          '11.222.333/0001-81', 'Notas', 'Teresina', 'PI', 'Responsável', null, null);
  _c := (_r ->> 'id')::uuid;
  perform public.set_onboarding_attributions(_c, array['notas']);

  _step := '2 administrador';
  perform public.onboarding_create_onboarding_administrator(_c, gen_random_uuid(), 'Adm Regressão', 'adm-regressao@example.invalid', null);

  _step := '3 pesquisa';
  perform public.onboarding_save_onboarding_survey(_c, 'Pesquisa Regressão', 'Descrição', true);

  _step := '4 perguntas (publicar)';
  perform public.onboarding_publish_onboarding_survey(_c);

  _step := '5/6 ponto e QR';
  perform public.onboarding_save_onboarding_point(_c, 'Balcão', 'Recepção', null);

  _step := 'ativação antes do teste';
  begin
    perform public.onboarding_set_onboarding_operational_status(_c, 'activate');
    raise exception 'FALHA: ativou sem avaliação de teste';
  exception when others then
    if sqlerrm not like '%incomplete_onboarding%' then raise; end if;
  end;

  _step := '7 preparar teste';
  _r := public.onboarding_prepare_onboarding_test(_c);
  _code := _r ->> 'code';
  _token := (_r ->> 'testToken')::uuid;

  -- avaliação de teste chega pelo servidor (service_role)
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  select jsonb_object_agg(q.id::text,
           case when q.tipo in ('stars', 'scale') then to_jsonb(5) else to_jsonb('sim'::text) end)
    into _ans
  from public.perguntas q join public.pesquisas s on s.id = q.pesquisa_id
  where s.cartorio_id = _c and q.ativa and q.tipo in ('stars', 'scale', 'yes_no');
  _step := '7 enviar teste';
  perform public.submit_onboarding_test_evaluation(_code, _token, gen_random_uuid(), md5(random()::text) || md5(random()::text), _ans);

  _step := '8 ativação';
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';
  _check := public.onboarding_get_onboarding_checklist(_c);
  if not coalesce((_check ->> 'complete')::boolean, false) then raise exception 'FALHA: checklist incompleto: %', _check; end if;
  perform public.onboarding_set_onboarding_operational_status(_c, 'activate');
  execute 'reset role';

  if (select status from public.cartorios where id = _c) <> 'ativo' then raise exception 'FALHA: cartório não ficou ativo'; end if;
  if (select count(*) from public.avaliacoes where cartorio_id = _c and not is_test) <> 0 then
    raise exception 'FALHA: avaliação de teste entrou como real';
  end if;

  -- auditoria: nenhuma linha com usuário de outro cartório; o administrador fica em platform_actor_id
  select count(*) into _n from public.audit_logs a
  where a.cartorio_id = _c and a.metadata ->> 'platform_actor_id' = _admin::text;
  if _n < 3 then raise exception 'FALHA: auditoria sem platform_actor_id (% linhas)', _n; end if;

  raise exception 'DRY_RUN_OK: implantação completa (8 etapas passaram, nada foi gravado)';
exception when others then
  if sqlerrm like 'DRY_RUN_OK%' then raise; end if;
  raise exception 'FALHA na etapa "%": %', _step, sqlerrm;
end $$;
