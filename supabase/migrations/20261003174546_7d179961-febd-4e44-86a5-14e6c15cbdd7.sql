create or replace function cartoquali_private.validate_evaluation_point()
returns trigger
language plpgsql
security definer
set search_path = public, cartoquali_private, pg_temp
as $$
declare
  _cartorio_id uuid;
  _is_service boolean := coalesce(auth.role(), '') = 'service_role' or session_user in ('postgres','supabase_admin','service_role');
begin
  if not _is_service then
    _cartorio_id := cartoquali_private.current_cartorio_id();
    if _cartorio_id is null then raise exception 'unauthorized' using errcode='42501'; end if;
    if not cartoquali_private.has_any_role(array['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']) then
      raise exception 'forbidden' using errcode='42501';
    end if;
    new.cartorio_id := case when tg_op='INSERT' then _cartorio_id else old.cartorio_id end;
  elsif tg_op='UPDATE' then
    new.cartorio_id := old.cartorio_id;
  end if;

  new.nome := btrim(new.nome);
  new.codigo := upper(btrim(new.codigo));
  new.localizacao := btrim(new.localizacao);
  new.descricao := nullif(btrim(new.descricao), '');
  new.metodo := 'link_qr_nfc';
  new.updated_at := now();

  if new.nome = '' or length(new.nome) > 120
     or new.codigo !~ '^[A-Z0-9][A-Z0-9-]{2,39}$'
     or new.localizacao = '' or length(new.localizacao) > 160
     or coalesce(length(new.descricao), 0) > 500
     or new.status not in ('ativo','inativo') then
    raise exception 'invalid_point' using errcode='22023';
  end if;

  if not exists (
    select 1 from public.pesquisas p
    where p.id = new.pesquisa_id
      and p.cartorio_id = new.cartorio_id
      and p.status = 'ativa'
  ) then
    raise exception 'survey_unavailable' using errcode='22023';
  end if;

  if tg_op='INSERT' then new.public_slug := lower(new.codigo);
  else new.public_slug := old.public_slug;
  end if;
  return new;
end;
$$;
revoke all on function cartoquali_private.validate_evaluation_point() from public, anon, authenticated;
grant execute on function cartoquali_private.validate_evaluation_point() to service_role;