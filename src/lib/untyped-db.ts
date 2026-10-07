import type { SupabaseClient } from "@supabase/supabase-js";

// The generated Supabase types (src/integrations/supabase/types.ts) are owned by Lovable and do not
// yet include the tables, columns and RPCs added in the 20261008* migrations. Use this view only
// for those; keep everything else on the typed client.
export const untypedDb = (client: unknown) => client as SupabaseClient;
