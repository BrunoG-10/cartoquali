CREATE POLICY "commercial_leads_block_client_access"
ON public.commercial_leads
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);