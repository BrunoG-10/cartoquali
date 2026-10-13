-- Implantação: a auditoria de cada etapa volta a passar por cartoquali_private.onboarding_audit.
-- O administrador da plataforma pertence a outro cartório (DEMO) e audit_logs exige que user_id
-- seja do mesmo cartório (FK user_id + cartorio_id). A etapa da pesquisa, reescrita na migração do
-- QR único, voltou a gravar audit_logs direto com _caller e passou a falhar para todo cartório novo
-- ("Não foi possível salvar a pesquisa"). Esta migração troca, em todas as funções de implantação,
-- qualquer INSERT direto em audit_logs com _caller pela função auxiliar, que grava user_id nulo e
-- guarda o administrador em metadata.platform_actor_id.
do $$
declare
  _f record;
  _ddl text;
  _new text;
  _pattern constant text :=
    'insert\s+into\s+public\.audit_logs\s*\(\s*cartorio_id\s*,\s*user_id\s*,\s*action\s*,\s*entity\s*,\s*entity_id\s*,\s*metadata\s*\)\s*values\s*\(\s*([^,]+?)\s*,\s*_caller\s*,';
begin
  for _f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cartoquali_private' and p.proname like '%onboarding%'
      and p.proname <> 'onboarding_audit'
      and p.prosrc ~* _pattern
  loop
    _ddl := pg_get_functiondef(_f.sig);
    _new := regexp_replace(_ddl, _pattern, 'perform cartoquali_private.onboarding_audit(\1, _caller,', 'gi');
    if _new = _ddl then raise exception 'implantacao_auditoria: nada trocado em %', _f.sig; end if;
    execute _new;
  end loop;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cartoquali_private' and p.proname like '%onboarding%'
      and p.proname <> 'onboarding_audit' and p.prosrc ~* _pattern
  ) then
    raise exception 'implantacao_auditoria: ainda há INSERT direto com _caller';
  end if;
end $$;
