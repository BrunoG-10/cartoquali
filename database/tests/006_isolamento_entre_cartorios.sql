-- Auditoria de isolamento entre cartórios. Rodar SEMPRE dentro de uma transação desfeita:
-- begin; <este arquivo>; rollback;
-- O administrador de outro cartório ATIVO (o primeiro real com administrador ativo, ex.: o piloto
-- do ensaio; sem nenhum, um cartório de teste oculto é ativado só dentro da transação) tenta ler e
-- alterar dados do DEMO em todas as tabelas. Depois, um visitante anônimo tenta ler tudo.
-- O bloco termina com uma exceção: ISOLAMENTO_OK (nenhum vazamento) ou ISOLAMENTO_FALHA (lista os pontos).
do $$
declare
  _demo uuid := '10000000-0000-4000-8000-000000000001';
  _b_cartorio uuid;
  _b_auth uuid;
  _real boolean := true;
  _demo_evals uuid[];
  _demo_users uuid[];
  _t text;
  _n bigint;
  _leaks text := '';
  _checked int := 0;
  _anon_exec text := '';
begin
  -- Preparação (como dono do banco; a trava de status do cartório só libera o service_role)
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  select c.id, u.auth_user_id into _b_cartorio, _b_auth
  from public.cartorios c
  join public.usuarios u on u.cartorio_id = c.id and u.status = 'ativo' and u.auth_user_id is not null
  join public.user_roles r on r.user_id = u.id and r.role = 'CARTORIO_ADMIN'
  where c.id <> _demo and c.status = 'ativo' and not c.oculto
  order by c.created_at limit 1;
  if _b_cartorio is null then
    _real := false;
    _b_cartorio := 'dd61eea8-f5dd-407c-9fc8-50f338767096';   -- Stage 12 0 (teste, oculto)
    _b_auth := 'dd5be703-2cbc-46e0-ac99-68d39374dc8c';       -- administrador desse cartório
    update public.cartorios set status = 'ativo' where id = _b_cartorio;
    update public.usuarios set status = 'ativo' where auth_user_id = _b_auth;
  end if;
  select array_agg(id) into _demo_evals from public.avaliacoes where cartorio_id = _demo;
  select array_agg(id) into _demo_users from public.usuarios where cartorio_id = _demo;

  -- 0) toda tabela do esquema public tem RLS ligada
  for _t in select c.relname from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity loop
    _leaks := _leaks || format(' | sem RLS: %s', _t);
  end loop;
  -- 0b) nenhuma view pública roda com os privilégios do dono (o que ignoraria a RLS)
  for _t in select c.relname from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
              and not coalesce('security_invoker=true' = any(c.reloptions), false)
              and (has_table_privilege('authenticated', c.oid, 'select') or has_table_privilege('anon', c.oid, 'select')) loop
    _leaks := _leaks || format(' | view sem security_invoker: %s', _t);
  end loop;

  -- 1) administrador do cartório B, logado
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_b_auth)::text, true);
  execute 'set local role authenticated';
  if cartoquali_private.current_cartorio_id() is distinct from _b_cartorio then
    raise exception 'FALHA pré: sessão do cartório B não reconhecida (%).', cartoquali_private.current_cartorio_id();
  end if;

  -- 1a) leitura e alteração de linhas de outro cartório, em toda tabela com cartorio_id
  for _t in select col.table_name::text from information_schema.columns col
            join information_schema.tables tb on tb.table_schema = col.table_schema and tb.table_name = col.table_name
            where col.table_schema = 'public' and col.column_name = 'cartorio_id' and tb.table_type = 'BASE TABLE'
            order by 1 loop
    _checked := _checked + 1;
    begin
      execute format('select count(*) from public.%I where cartorio_id <> $1', _t) into _n using _b_cartorio;
      if _n > 0 then _leaks := _leaks || format(' | LÊ %s linhas de outro cartório em %s', _n, _t); end if;
    exception when insufficient_privilege then null;
    end;
    begin
      execute format('update public.%I set cartorio_id = cartorio_id where cartorio_id <> $1', _t) using _b_cartorio;
      get diagnostics _n = row_count;
      if _n > 0 then _leaks := _leaks || format(' | ALTERA %s linhas de outro cartório em %s', _n, _t); end if;
    exception
      when insufficient_privilege then null;
      when others then _leaks := _leaks || format(' | verificar update em %s: %s', _t, sqlerrm);
    end;
  end loop;

  -- 1b) tabelas ligadas por outra chave
  begin
    select count(*) into _n from public.respostas where avaliacao_id = any(_demo_evals);
    if _n > 0 then _leaks := _leaks || format(' | LÊ %s respostas do DEMO', _n); end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into _n from public.user_roles where user_id = any(_demo_users);
    if _n > 0 then _leaks := _leaks || format(' | LÊ %s perfis de usuários do DEMO', _n); end if;
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into _n from public.guia_progresso where usuario_id = any(_demo_users);
    if _n > 0 then _leaks := _leaks || format(' | LÊ %s progressos de guia do DEMO', _n); end if;
  exception when insufficient_privilege then null; end;

  -- 1c) funções de leitura agregada respondem só com o próprio cartório / recusam
  begin
    perform public.get_platform_overview();
    _leaks := _leaks || ' | painel da plataforma aberto para administrador de cartório';
  exception when others then null;
  end;

  -- 1d) sentido inverso: o administrador do DEMO (também administrador da plataforma) não lê nem
  --     altera linhas do outro cartório pelas tabelas
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub','d92c734a-9305-4b68-b7cc-67419eb52337')::text, true);
  execute 'set local role authenticated';
  for _t in select col.table_name::text from information_schema.columns col
            join information_schema.tables tb on tb.table_schema = col.table_schema and tb.table_name = col.table_name
            where col.table_schema = 'public' and col.column_name = 'cartorio_id' and tb.table_type = 'BASE TABLE'
            order by 1 loop
    begin
      execute format('select count(*) from public.%I where cartorio_id = $1', _t) into _n using _b_cartorio;
      if _n > 0 then _leaks := _leaks || format(' | DEMO LÊ %s linhas do outro cartório em %s', _n, _t); end if;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- 2) visitante anônimo não lê nenhuma tabela
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  execute 'set local role anon';
  for _t in select c.relname from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v') order by 1 loop
    begin
      execute format('select count(*) from public.%I', _t) into _n;
      if _n > 0 then _leaks := _leaks || format(' | anônimo LÊ %s linhas em %s', _n, _t); end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  execute 'reset role';

  -- 3) funções que o visitante anônimo pode chamar (para conferência; esperado: só as da avaliação pública)
  select coalesce(string_agg(p.proname, ', ' order by p.proname), 'nenhuma') into _anon_exec
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute');

  if _leaks = '' then
    raise exception 'ISOLAMENTO_OK: % tabelas com cartorio_id testadas nos dois sentidos (%), nenhum vazamento (nada foi gravado). Funções liberadas ao anônimo: %',
      _checked,
      case when _real then 'DEMO x ' || (select nome_fantasia from public.cartorios where id = _b_cartorio) else 'DEMO x cartório de teste ativado na transação' end,
      _anon_exec;
  end if;
  raise exception 'ISOLAMENTO_FALHA:%. Funções liberadas ao anônimo: %', _leaks, _anon_exec;
end $$;
