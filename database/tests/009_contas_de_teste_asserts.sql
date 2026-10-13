-- Verificações da desativação das contas de teste. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261014010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _n int;
  _auth uuid;
begin
  -- a) nenhum usuário ativo sobrou nos cartórios ocultos
  select count(*) into _n from public.usuarios u join public.cartorios c on c.id = u.cartorio_id
  where c.oculto and u.status = 'ativo';
  if _n <> 0 then raise exception 'FALHA a: % usuários ativos em cartórios ocultos', _n; end if;

  -- b) o administrador da plataforma (DEMO) continua ativo
  if (select status from public.usuarios where auth_user_id = 'd92c734a-9305-4b68-b7cc-67419eb52337') <> 'ativo' then
    raise exception 'FALHA b: administrador da plataforma foi desativado';
  end if;

  -- c) nenhum usuário de cartório visível foi alterado agora
  select count(*) into _n from public.usuarios u join public.cartorios c on c.id = u.cartorio_id
  where not c.oculto and u.updated_at >= now() - interval '1 minute';
  if _n <> 0 then raise exception 'FALHA c: % usuários de cartórios visíveis alterados', _n; end if;

  -- d) a troca ficou na auditoria
  select count(*) into _n from public.audit_logs a join public.cartorios c on c.id = a.cartorio_id
  where c.oculto and a.entity = 'user' and a.created_at >= now() - interval '1 minute';
  if _n < 9 then raise exception 'FALHA d: registros de auditoria = %', _n; end if;

  -- e) uma conta de teste desativada não é mais reconhecida como usuário do sistema
  select auth_user_id into _auth from public.usuarios
  where email = 'stage12-admin-41d87bea@example.com';
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';
  if cartoquali_private.current_user_id() is not null then
    raise exception 'FALHA e: conta de teste ainda reconhecida';
  end if;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: contas de teste (a-e passaram, nada foi gravado)';
end $$;
