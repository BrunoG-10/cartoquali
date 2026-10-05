CREATE TABLE public.commercial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  registry_name text NOT NULL,
  city_state text NOT NULL,
  role_title text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_leads_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT commercial_leads_registry_length CHECK (char_length(registry_name) BETWEEN 2 AND 160),
  CONSTRAINT commercial_leads_city_state_length CHECK (char_length(city_state) BETWEEN 2 AND 120),
  CONSTRAINT commercial_leads_role_length CHECK (char_length(role_title) BETWEEN 2 AND 100),
  CONSTRAINT commercial_leads_whatsapp_length CHECK (char_length(whatsapp) BETWEEN 8 AND 30),
  CONSTRAINT commercial_leads_email_length CHECK (char_length(email) BETWEEN 3 AND 255),
  CONSTRAINT commercial_leads_source_hash_format CHECK (source_hash ~ '^[0-9a-f]{64}$')
);

GRANT ALL ON public.commercial_leads TO service_role;

ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX commercial_leads_source_created_idx
  ON public.commercial_leads (source_hash, created_at DESC);

COMMENT ON TABLE public.commercial_leads IS 'Solicitações comerciais de demonstração do CartoQuali, separadas das avaliações de usuários.';
COMMENT ON COLUMN public.commercial_leads.source_hash IS 'Hash técnico efêmero da sessão para limitação de abuso; não contém IP ou user-agent.';