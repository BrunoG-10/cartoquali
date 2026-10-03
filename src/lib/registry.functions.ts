import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Registry } from "@/types/cartoquali";

const registryUpdateSchema = z.object({
  officialName: z.string().trim().min(1).max(200),
  tradeName: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().min(1).max(30),
  serviceType: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
  email: z.string().trim().email().max(255),
  street: z.string().trim().max(200),
  number: z.string().trim().max(30),
  complement: z.string().trim().max(120),
  district: z.string().trim().max(120),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2),
  zipCode: z.string().trim().max(20),
  manager: z.string().trim().min(1).max(160),
});

type RegistryRow = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  tipo: string;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  responsavel: string;
  status: string;
  plano: string;
  data_renovacao: string | null;
  created_at: string;
};

function toRegistry(row: RegistryRow): Registry {
  return {
    id: row.id,
    slug: "",
    officialName: row.razao_social,
    tradeName: row.nome_fantasia,
    cnpj: row.cnpj,
    serviceType: row.tipo,
    phone: row.telefone ?? "",
    email: row.email ?? "",
    street: row.endereco ?? "",
    number: row.numero ?? "",
    complement: row.complemento ?? "",
    district: row.bairro ?? "",
    city: row.cidade,
    state: row.estado,
    zipCode: row.cep ?? "",
    manager: row.responsavel,
    status: row.status === "ativo" ? "Ativo" : "Inativo",
    plan: row.plano,
    createdAt: row.created_at.slice(0, 10),
    renewalDate: row.data_renovacao ?? "",
  };
}

const registryColumns = "id, razao_social, nome_fantasia, cnpj, tipo, telefone, email, cep, endereco, numero, complemento, bairro, cidade, estado, responsavel, status, plano, data_renovacao, created_at";

export const getMyRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("usuarios")
      .select("cartorio_id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error("Não foi possível identificar seu cartório.");
    if (!profile) return { status: "missing_registry" as const, registry: null };

    const { data, error } = await context.supabase
      .from("cartorios")
      .select(registryColumns)
      .eq("id", profile.cartorio_id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar os dados do cartório.");
    if (!data) return { status: "missing_registry" as const, registry: null };
    return { status: data.status === "ativo" ? "active" as const : "inactive" as const, registry: toRegistry(data) };
  });

export const updateMyRegistry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registryUpdateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("usuarios")
      .select("cartorio_id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (profileError || !profile) throw new Error("Seu usuário não possui um cartório válido.");

    const { data: updated, error } = await context.supabase
      .from("cartorios")
      .update({
        razao_social: data.officialName,
        nome_fantasia: data.tradeName,
        cnpj: data.cnpj,
        tipo: data.serviceType,
        telefone: data.phone || null,
        email: data.email,
        endereco: data.street || null,
        numero: data.number || null,
        complemento: data.complement || null,
        bairro: data.district || null,
        cidade: data.city,
        estado: data.state.toUpperCase(),
        cep: data.zipCode || null,
        responsavel: data.manager,
      })
      .eq("id", profile.cartorio_id)
      .select(registryColumns)
      .maybeSingle();
    if (error) throw new Error(error.code === "42501" ? "Você não possui permissão para editar o cartório." : "Não foi possível salvar os dados do cartório.");
    if (!updated) throw new Error("O cartório não foi encontrado ou você não possui permissão para editá-lo.");
    return toRegistry(updated);
  });