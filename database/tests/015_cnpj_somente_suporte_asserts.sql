-- CNPJ e razão social só pelo suporte. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261020010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _auth uuid;
  _cartorio uuid;
  _n int;
  _blocked boolean;
begin
  -- administrador de cartório ativo, sem perfil de plataforma
  select u.auth_user_id, u.cartorio_id into _auth, _cartorio
  from public.usuarios u join public.cartorios c on c.id = u.cartorio_id
  where u.status = 'ativo' and c.status = 'ativo' and u.auth_user_id is not null
    and exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'CARTORIO_ADMIN')
    and not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'PLATFORM_ADMIN')
  limit 1;
  if _auth is null then raise exception 'FALHA pré: nenhum administrador de cartório sem plataforma'; end if;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';

  -- a) continua alterando os demais dados
  update public.cartorios set nome_fantasia = nome_fantasia || ' ' where id = _cartorio;
  get diagnostics _n = row_count;
  if _n <> 1 then raise exception 'FALHA a: administrador não alterou o nome fantasia'; end if;

  -- b) não altera o CNPJ
  _blocked := false;
  begin
    update public.cartorios set cnpj = '11222333000181' where id = _cartorio;
  exception when insufficient_privilege then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA b: administrador alterou o CNPJ'; end if;

  -- c) não altera a razão social
  _blocked := false;
  begin
    update public.cartorios set razao_social = razao_social || ' X' where id = _cartorio;
  exception when insufficient_privilege then _blocked := true;
  end;
  if not _blocked then raise exception 'FALHA c: administrador alterou a razão social'; end if;
  execute 'reset role';

  -- d) o administrador da plataforma continua podendo corrigir (implantação)
  perform set_config('request.jwt.claims',
    json_build_object('role','authenticated','sub','d92c734a-9305-4b68-b7cc-67419eb52337')::text, true);
  execute 'set local role authenticated';
  update public.cartorios set cnpj = cnpj where id = '10000000-0000-4000-8000-000000000001';
  update public.cartorios set razao_social = razao_social || ' ' where id = '10000000-0000-4000-8000-000000000001';
  get diagnostics _n = row_count;
  if _n <> 1 then raise exception 'FALHA d: plataforma não alterou a razão social'; end if;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: CNPJ só pelo suporte (a-d passaram, nada foi gravado)';
end $$;
