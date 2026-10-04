DO $$
DECLARE ids uuid[]; survey_ids uuid[]; question_ids uuid[];
BEGIN
 SELECT array_agg(id) INTO ids FROM public.cartorios WHERE razao_social LIKE 'E15 %';
 IF ids IS NULL THEN RETURN; END IF;
 SELECT array_agg(id) INTO survey_ids FROM public.pesquisas WHERE cartorio_id=ANY(ids);
 IF survey_ids IS NOT NULL THEN SELECT array_agg(id) INTO question_ids FROM public.perguntas WHERE pesquisa_id=ANY(survey_ids); END IF;
 IF question_ids IS NOT NULL THEN DELETE FROM public.opcoes_resposta WHERE pergunta_id=ANY(question_ids); END IF;
 IF survey_ids IS NOT NULL THEN DELETE FROM public.perguntas WHERE pesquisa_id=ANY(survey_ids); END IF;
 ALTER TABLE public.pontos_avaliacao DISABLE TRIGGER prevent_evaluation_point_delete;
 DELETE FROM public.pontos_avaliacao WHERE cartorio_id=ANY(ids);
 ALTER TABLE public.pontos_avaliacao ENABLE TRIGGER prevent_evaluation_point_delete;
 DELETE FROM public.pesquisas WHERE cartorio_id=ANY(ids);
 DELETE FROM public.cartorios WHERE id=ANY(ids);
END $$;