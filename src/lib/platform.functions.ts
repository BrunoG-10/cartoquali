import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePlatformOverview, type PlatformOverview } from "@/lib/platform-overview";
import { untypedDb } from "@/lib/untyped-db";

// Painel da plataforma: as RPCs conferem o perfil PLATFORM_ADMIN da sessão antes de qualquer leitura
// ou escrita; o id do cartório vindo da tela só escolhe a linha, nunca concede acesso.
export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformOverview> => {
    const db = untypedDb(context.supabase);
    const { data, error } = await db.rpc("get_platform_overview", {});
    if (error) {
      if (error.message?.includes("forbidden"))
        throw new Error("Somente o administrador da plataforma pode ver este painel.");
      throw new Error("Não foi possível carregar o painel da plataforma.");
    }
    return parsePlatformOverview(data);
  });

const BILLING_ERRORS: Record<string, string> = {
  forbidden: "Somente o administrador da plataforma pode controlar a cobrança.",
  invalid_billing: "Confira o valor (maior que zero) e o dia de vencimento (1 a 28).",
  billing_not_configured: "Configure a cobrança do cartório antes de registrar pagamentos.",
  invalid_payment: "Confira valor, data e forma do pagamento.",
  duplicate_payment: "Este mês já tem pagamento registrado.",
  payment_not_found: "Pagamento não encontrado; atualize o painel.",
};

function billingError(message: string | undefined, fallback: string): Error {
  const key = Object.keys(BILLING_ERRORS).find((code) => message?.includes(code));
  return new Error(key ? BILLING_ERRORS[key] : fallback);
}

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().positive().max(1_000_000);

export const saveRegistryBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        registryId: z.string().uuid(),
        monthlyFee: money,
        dueDay: z.number().int().min(1).max(28),
        startMonth: month,
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("set_registry_billing", {
      _cartorio_id: data.registryId,
      _valor: data.monthlyFee,
      _dia: data.dueDay,
      _inicio: `${data.startMonth}-01`,
      _ativo: data.active,
    });
    if (error) throw billingError(error.message, "Não foi possível salvar a cobrança.");
    return { ok: true };
  });

export const registerRegistryPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        registryId: z.string().uuid(),
        month,
        amount: money,
        paidOn: day,
        method: z.enum(["pix", "boleto", "transferencia", "outro"]),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("register_registry_payment", {
      _cartorio_id: data.registryId,
      _competencia: `${data.month}-01`,
      _valor: data.amount,
      _pago_em: data.paidOn,
      _forma: data.method,
      _observacao: data.note || null,
    });
    if (error) throw billingError(error.message, "Não foi possível registrar o pagamento.");
    return { ok: true };
  });

export const removeRegistryPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("remove_registry_payment", {
      _id: data.paymentId,
    });
    if (error) throw billingError(error.message, "Não foi possível desfazer o pagamento.");
    return { ok: true };
  });
