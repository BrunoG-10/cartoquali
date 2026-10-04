CREATE OR REPLACE FUNCTION cartoquali_private.validate_evaluation_point()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE
  v_current_registry uuid;
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role' OR session_user IN ('postgres','supabase_admin','service_role');
  v_is_platform_admin boolean := false;
BEGIN
  IF NOT v_is_service THEN
    v_current_registry := cartoquali_private.current_cartorio_id();
    IF v_current_registry IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
    v_is_platform_admin := cartoquali_private.has_any_role(ARRAY['PLATFORM_ADMIN']);
    IF NOT cartoquali_private.has_any_role(ARRAY['PLATFORM_ADMIN','CARTORIO_ADMIN','GESTOR']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
    IF NOT v_is_platform_admin THEN
      new.cartorio_id := CASE WHEN tg_op='INSERT' THEN v_current_registry ELSE old.cartorio_id END;
    ELSIF tg_op='UPDATE' THEN
      new.cartorio_id := old.cartorio_id;
    END IF;
  ELSIF tg_op='UPDATE' THEN
    new.cartorio_id := old.cartorio_id;
  END IF;

  new.nome := btrim(new.nome);
  new.codigo := upper(btrim(new.codigo));
  new.localizacao := btrim(new.localizacao);
  new.descricao := nullif(btrim(new.descricao), '');
  new.metodo := 'link_qr_nfc';
  new.updated_at := now();

  IF new.nome='' OR length(new.nome)>120 OR new.codigo !~ '^[A-Z0-9][A-Z0-9-]{2,39}$' OR new.localizacao='' OR length(new.localizacao)>160 OR coalesce(length(new.descricao),0)>500 OR new.status NOT IN ('ativo','inativo') THEN RAISE EXCEPTION 'invalid_point' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pesquisas p WHERE p.id=new.pesquisa_id AND p.cartorio_id=new.cartorio_id AND p.status='ativa') THEN RAISE EXCEPTION 'survey_unavailable' USING ERRCODE='22023'; END IF;
  IF tg_op='INSERT' THEN new.public_slug:=lower(new.codigo); ELSE new.public_slug:=old.public_slug; END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.validate_evaluation_point() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.validate_evaluation_point() TO service_role;