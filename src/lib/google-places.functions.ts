import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GOOGLE_PLACE_ID } from "@/lib/google-review";
import { untypedDb } from "@/lib/untyped-db";

export type GooglePlaceResult = { placeId: string; name: string; address: string };

// Places API (New) Text Search, called only from the server with the key in the environment
// (GOOGLE_PLACES_API_KEY, never sent to the browser). The field mask keeps to id, name and
// address — the cheapest tier for this lookup.
export const searchGooglePlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ term: z.string().trim().min(3).max(120) }).parse(input))
  .handler(async ({ context, data }): Promise<GooglePlaceResult[]> => {
    // Authorization (registry administrator, as in Settings) and per-user rate limit, in the database.
    const { error: guardError } = await untypedDb(context.supabase).rpc(
      "registrar_busca_google_places",
    );
    if (guardError)
      throw new Error(
        guardError.message.includes("rate_limited")
          ? "Muitas buscas em pouco tempo. Aguarde alguns minutos."
          : "Você não possui permissão para configurar o perfil do Google.",
      );
    const key = process.env["GOOGLE_PLACES_API_KEY"];
    if (!key)
      throw new Error(
        "A busca no Google ainda não foi configurada. Cole o código do perfil em Avançado.",
      );
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: data.term,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: 5,
      }),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);
    if (!response?.ok) {
      console.error("[google-places] search failed", response?.status ?? "network");
      throw new Error("Não foi possível buscar no Google agora. Tente novamente em instantes.");
    }
    const body = (await response.json().catch(() => ({}))) as {
      places?: Array<{
        id?: unknown;
        displayName?: { text?: unknown };
        formattedAddress?: unknown;
      }>;
    };
    return (body.places ?? [])
      .filter((place) => typeof place.id === "string" && GOOGLE_PLACE_ID.test(place.id))
      .slice(0, 5)
      .map((place) => ({
        placeId: place.id as string,
        name: typeof place.displayName?.text === "string" ? place.displayName.text : "Sem nome",
        address: typeof place.formattedAddress === "string" ? place.formattedAddress : "",
      }));
  });
