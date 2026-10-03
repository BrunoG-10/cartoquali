REVOKE EXECUTE ON FUNCTION public.get_public_evaluation_context(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_evaluation_context(text) TO service_role;