CREATE OR REPLACE FUNCTION cartoquali_private.audit_administration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','cartoquali_private','pg_temp' AS $$
DECLARE _cartorio_id uuid; _entity text; _entity_id uuid; _action text; _actor uuid; _metadata jsonb; _question_id uuid;
BEGIN
 IF tg_table_name='cartorios' THEN _cartorio_id:=coalesce(new.id,old.id);
 ELSIF tg_table_name='user_roles' THEN SELECT cartorio_id INTO _cartorio_id FROM public.usuarios WHERE id=coalesce(new.user_id,old.user_id);
 ELSIF tg_table_name='perguntas' THEN SELECT cartorio_id INTO _cartorio_id FROM public.pesquisas WHERE id=coalesce(new.pesquisa_id,old.pesquisa_id);
 ELSIF tg_table_name='opcoes_resposta' THEN _question_id:=coalesce(new.pergunta_id,old.pergunta_id); SELECT p.cartorio_id INTO _cartorio_id FROM public.perguntas q JOIN public.pesquisas p ON p.id=q.pesquisa_id WHERE q.id=_question_id;
 ELSE _cartorio_id:=coalesce(new.cartorio_id,old.cartorio_id); END IF;
 _entity_id:=coalesce(new.id,old.id);
 SELECT id INTO _actor FROM public.usuarios WHERE auth_user_id=auth.uid() AND cartorio_id=_cartorio_id AND status='ativo';
 _entity:=case tg_table_name when 'cartorios' then 'registry' when 'usuarios' then 'user' when 'user_roles' then 'user' when 'configuracoes_cartorio' then 'registry_settings' when 'pesquisas' then 'survey' when 'perguntas' then 'question' when 'opcoes_resposta' then 'answer_option' else tg_table_name end;
 _action:=case when tg_op='INSERT' then _entity||'_created' else _entity||'_updated' end;
 _metadata:=jsonb_build_object('operation',lower(tg_op),'changed_at',now());
 IF tg_table_name='usuarios' THEN _metadata:=_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'email_changed',case when tg_op='UPDATE' then new.email is distinct from old.email else false end);
 ELSIF tg_table_name='cartorios' THEN _metadata:=_metadata||jsonb_build_object('status',new.status,'has_phone',new.telefone is not null,'has_email',new.email is not null);
 ELSIF tg_table_name='user_roles' THEN _metadata:=_metadata||jsonb_build_object('role',new.role,'user_id',new.user_id); END IF;
 INSERT INTO public.audit_logs(cartorio_id,user_id,action,entity,entity_id,metadata) VALUES(_cartorio_id,_actor,_action,_entity,_entity_id,_metadata);
 RETURN new;
END $$;