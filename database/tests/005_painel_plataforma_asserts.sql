-- Verificações do painel da plataforma. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261011010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _admin_auth uuid := 'd92c734a-9305-4b68-b7cc-67419eb52337';
  _other_auth uuid := (
    select u.auth_user_id from public.usuarios u
    where u.cartorio_id = '10000000-0000-4000-8000-000000000001' and u.status = 'ativo'
      and u.auth_user_id is not null
      and not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'PLATFORM_ADMIN')
    limit 1);
  _expected_30 int;
  _expected_open int;
  _r jsonb;
  _demo_row jsonb;
begin
  if _other_auth is null then raise exception 'FALHA pré: falta um usuário do DEMO sem perfil de plataforma'; end if;

  -- a) os 6 cartórios de teste ficaram ocultos; o DEMO não
  if (select count(*) from public.cartorios where oculto and nome_fantasia like 'Stage %') <> 6 then
    raise exception 'FALHA a: cartórios de teste ocultos = %', (select count(*) from public.cartorios where oculto);
  end if;
  if (select oculto from public.cartorios where id = _demo) then raise exception 'FALHA a2: DEMO ficou oculto'; end if;

  -- valores esperados, calculados direto nas tabelas (avaliação de teste fora)
  select count(*) into _expected_30 from public.avaliacoes
  where cartorio_id = _demo and not is_test and created_at >= now() - interval '30 days';
  select count(*) into _expected_open from public.ocorrencias_qualidade
  where cartorio_id = _demo and status not in ('resolvida', 'encerrada');

  -- Daqui em diante, como cliente logado (o grant de execute para authenticated é testado).
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_admin_auth)::text, true);
  execute 'set local role authenticated';

  -- b) administrador da plataforma vê o DEMO e não vê os ocultos
  _r := public.get_platform_overview();
  if (_r ->> 'hiddenCount')::int < 6 then raise exception 'FALHA b: hiddenCount = %', _r ->> 'hiddenCount'; end if;
  if exists (select 1 from jsonb_array_elements(_r -> 'registries') x where x ->> 'name' like 'Stage %') then
    raise exception 'FALHA b2: cartório oculto apareceu';
  end if;
  select x into _demo_row from jsonb_array_elements(_r -> 'registries') x where (x ->> 'id')::uuid = _demo;
  if _demo_row is null then raise exception 'FALHA b3: DEMO não apareceu'; end if;

  -- c) números do DEMO batem com as tabelas
  if (_demo_row ->> 'evaluations30d')::int <> _expected_30 then
    raise exception 'FALHA c: avaliações 30d = %, esperado %', _demo_row ->> 'evaluations30d', _expected_30;
  end if;
  if (_demo_row ->> 'openOccurrences')::int <> _expected_open then
    raise exception 'FALHA c2: ocorrências abertas = %, esperado %', _demo_row ->> 'openOccurrences', _expected_open;
  end if;
  if (_demo_row ->> 'activeUsers')::int < 1 then raise exception 'FALHA c3: usuários ativos = 0'; end if;

  -- d) último acesso lido do Auth (o administrador já entrou no sistema)
  if _demo_row ->> 'lastAccessAt' is null then raise exception 'FALHA d: último acesso vazio'; end if;

  -- e) usuário sem perfil de plataforma é recusado
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_other_auth)::text, true);
  begin
    perform public.get_platform_overview();
    raise exception 'FALHA e: usuário comum leu o painel';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA e: erro inesperado: %', sqlerrm; end if;
  end;

  -- f) sem sessão é recusado
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.get_platform_overview();
    raise exception 'FALHA f: leu o painel sem sessão';
  exception when others then
    if sqlerrm not like '%forbidden%' then raise exception 'FALHA f: erro inesperado: %', sqlerrm; end if;
  end;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: painel da plataforma (a-f passaram, nada foi gravado)';
end $$;
