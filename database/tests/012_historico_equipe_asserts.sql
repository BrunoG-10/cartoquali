-- Histórico de ocorrências/planos para gestor e operador. Rodar SEMPRE dentro do dry run:
-- begin; <migração 20261017010000>; <este arquivo>
-- O bloco termina com a exceção DRY_RUN_OK, que desfaz tudo. Qualquer outra mensagem é falha.
do $$
declare
  _auth uuid;
  _cartorio uuid;
  _n bigint;
begin
  -- um usuário ativo SEM perfil de administrador, de um cartório que já tem histórico de ocorrência
  select u.auth_user_id, u.cartorio_id into _auth, _cartorio
  from public.usuarios u
  where u.status = 'ativo' and u.auth_user_id is not null
    and exists (select 1 from public.user_roles r where r.user_id = u.id and r.role in ('GESTOR', 'OPERADOR'))
    and not exists (select 1 from public.user_roles r where r.user_id = u.id
                    and r.role in ('CARTORIO_ADMIN', 'PLATFORM_ADMIN'))
    and exists (select 1 from public.audit_logs l where l.cartorio_id = u.cartorio_id
                and l.entity = 'quality_occurrence')
  limit 1;
  if _auth is null then
    raise exception 'FALHA pré: nenhum gestor/operador ativo em cartório com histórico de ocorrência';
  end if;

  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub',_auth)::text, true);
  execute 'set local role authenticated';

  -- a) lê o histórico das ocorrências do próprio cartório
  select count(*) into _n from public.audit_logs where entity = 'quality_occurrence';
  if _n = 0 then raise exception 'FALHA a: gestor/operador não lê o histórico de ocorrências'; end if;

  -- b) não lê nenhuma outra entidade da auditoria
  select count(*) into _n from public.audit_logs where entity not in ('quality_occurrence', 'improvement_plan');
  if _n > 0 then raise exception 'FALHA b: gestor/operador lê % registros de outras entidades', _n; end if;

  -- c) não lê histórico de outro cartório
  select count(*) into _n from public.audit_logs where cartorio_id <> _cartorio;
  if _n > 0 then raise exception 'FALHA c: lê % registros de outro cartório', _n; end if;

  -- d) continua sem poder gravar
  begin
    insert into public.audit_logs (cartorio_id, action, entity) values (_cartorio, 'teste', 'quality_occurrence');
    raise exception 'FALHA d: gestor/operador gravou na auditoria';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'DRY_RUN_OK: histórico para a equipe (a-d passaram, nada foi gravado)';
end $$;
