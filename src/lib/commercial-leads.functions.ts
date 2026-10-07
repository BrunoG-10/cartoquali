import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const commercialLeadSchema = z.object({
  clientRequestId: z.string().uuid(),
  submissionSession: z.string().uuid(),
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  registryName: z.string().trim().min(2, "Informe o cartório.").max(160),
  cityState: z.string().trim().min(2, "Informe a cidade e o estado.").max(120),
  roleTitle: z.string().trim().min(2, "Informe seu cargo.").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(8, "Informe um WhatsApp válido.")
    .max(30)
    .regex(/^[+()\-\s\d]+$/, "Informe um WhatsApp válido."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  website: z.string().max(0).optional(),
});

export type CommercialLeadInput = z.infer<typeof commercialLeadSchema>;

export const submitCommercialLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => commercialLeadSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store, max-age=0");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    if (data.website) return { ok: true, duplicate: false };

    const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
    const sourceBytes = new TextEncoder().encode(`${secret}:commercial:${data.submissionSession}`);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const sourceHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("commercial_leads")
      .select("id", { count: "exact", head: true })
      .eq("source_hash", sourceHash)
      .gte("created_at", since);
    if (countError) throw new Error("Não foi possível enviar sua solicitação agora.");
    if ((count ?? 0) >= 5)
      throw new Error("Muitas solicitações foram enviadas nesta sessão. Aguarde alguns minutos.");

    const { error } = await supabaseAdmin.from("commercial_leads").insert({
      client_request_id: data.clientRequestId,
      name: data.name,
      registry_name: data.registryName,
      city_state: data.cityState,
      role_title: data.roleTitle,
      whatsapp: data.whatsapp,
      email: data.email.toLowerCase(),
      source_hash: sourceHash,
    });
    if (error?.code === "23505") return { ok: true, duplicate: true };
    if (error) {
      console.error("[commercial-lead] insert failed", error.code);
      throw new Error("Não foi possível enviar sua solicitação agora. Tente novamente.");
    }
    return { ok: true, duplicate: false };
  });
