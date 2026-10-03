DROP POLICY IF EXISTS avaliacoes_update_own_tenant ON public.avaliacoes;
DROP POLICY IF EXISTS avaliacoes_delete_own_tenant ON public.avaliacoes;
DROP POLICY IF EXISTS respostas_update_own_tenant ON public.respostas;
DROP POLICY IF EXISTS respostas_delete_own_tenant ON public.respostas;

REVOKE UPDATE, DELETE ON public.avaliacoes FROM authenticated;
REVOKE UPDATE, DELETE ON public.respostas FROM authenticated;
GRANT SELECT, INSERT ON public.avaliacoes TO authenticated;
GRANT SELECT, INSERT ON public.respostas TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
GRANT ALL ON public.respostas TO service_role;