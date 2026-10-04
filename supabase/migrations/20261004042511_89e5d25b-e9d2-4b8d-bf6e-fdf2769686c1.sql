CREATE OR REPLACE FUNCTION cartoquali_private.onboarding_audit(_cartorio_id uuid,_actor uuid,_action text,_entity text,_entity_id uuid,_metadata jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor_belongs boolean;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.usuarios u WHERE u.id=_actor AND u.cartorio_id=_cartorio_id) INTO v_actor_belongs;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata)
 VALUES(_cartorio_id,CASE WHEN v_actor_belongs THEN _actor ELSE NULL END,_action,_entity,_entity_id,coalesce(_metadata,'{}'::jsonb)||CASE WHEN _actor IS NOT NULL AND NOT v_actor_belongs THEN jsonb_build_object('platform_actor_id',_actor) ELSE '{}'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.onboarding_audit(uuid,uuid,text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.onboarding_audit(uuid,uuid,text,text,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION cartoquali_private.audit_administration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE v_registry uuid; v_entity text; v_entity_id uuid; v_action text; v_actor uuid; v_platform_actor uuid; v_metadata jsonb; v_question_id uuid;
BEGIN
 IF tg_table_name='cartorios' THEN v_registry:=coalesce(new.id,old.id);
 ELSIF tg_table_name='user_roles' THEN SELECT u.cartorio_id INTO v_registry FROM public.usuarios u WHERE u.id=coalesce(new.user_id,old.user_id);
 ELSIF tg_table_name='perguntas' THEN SELECT p.cartorio_id INTO v_registry FROM public.pesquisas p WHERE p.id=coalesce(new.pesquisa_id,old.pesquisa_id);
 ELSIF tg_table_name='opcoes_resposta' THEN v_question_id:=coalesce(new.pergunta_id,old.pergunta_id); SELECT p.cartorio_id INTO v_registry FROM public.perguntas q JOIN public.pesquisas p ON p.id=q.pesquisa_id WHERE q.id=v_question_id;
 ELSE v_registry:=coalesce(new.cartorio_id,old.cartorio_id); END IF;
 v_entity_id:=coalesce(new.id,old.id);
 SELECT u.id INTO v_actor FROM public.usuarios u WHERE u.auth_user_id=auth.uid() AND u.cartorio_id=v_registry AND u.status='ativo';
 IF v_actor IS NULL THEN SELECT u.id INTO v_platform_actor FROM public.usuarios u JOIN public.user_roles r ON r.user_id=u.id WHERE u.auth_user_id=auth.uid() AND u.status='ativo' AND r.role='PLATFORM_ADMIN' LIMIT 1; END IF;
 v_entity:=case tg_table_name when 'cartorios' then 'registry' when 'usuarios' then 'user' when 'user_roles' then 'user' when 'configuracoes_cartorio' then 'registry_settings' when 'pesquisas' then 'survey' when 'perguntas' then 'question' when 'opcoes_resposta' then 'answer_option' else tg_table_name end;
 v_action:=case when tg_op='INSERT' then v_entity||'_created' else v_entity||'_updated' end;
 v_metadata:=jsonb_build_object('operation',lower(tg_op),'changed_at',now())||CASE WHEN v_actor IS NULL AND v_platform_actor IS NOT NULL THEN jsonb_build_object('platform_actor_id',v_platform_actor) ELSE '{}'::jsonb END;
 IF tg_table_name='usuarios' THEN v_metadata:=v_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'email_changed',case when tg_op='UPDATE' then new.email is distinct from old.email else false end);
 ELSIF tg_table_name='cartorios' THEN v_metadata:=v_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'has_email',new.email is not null);
 ELSIF tg_table_name='user_roles' THEN v_metadata:=v_metadata||jsonb_build_object('role',new.role,'user_id',new.user_id); END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(v_registry,v_actor,v_action,v_entity,v_entity_id,v_metadata);
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION cartoquali_private.audit_administration() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION cartoquali_private.audit_administration() TO service_role;