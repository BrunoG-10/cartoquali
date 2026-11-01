import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { searchGooglePlaces, type GooglePlaceResult } from "@/lib/google-places.functions";
import { GOOGLE_PLACE_ID, googleReviewUrl } from "@/lib/google-review";
import { userMessage } from "@/lib/user-message";

export type GoogleReviewChoice = {
  placeId: string | null;
  placeName: string | null;
  inviteActive: boolean;
};

/**
 * Perfil do Google e convite na tela de agradecimento. Usado pelo próprio cartório
 * (Configurações) e pelo administrador global (Painel da plataforma); quem chama decide quando
 * gravar cada mudança.
 */
export function GooglePlacePicker({
  value,
  busy = false,
  onChange,
}: {
  value: GoogleReviewChoice;
  busy?: boolean;
  onChange(next: GoogleReviewChoice): void;
}) {
  const search = useServerFn(searchGooglePlaces);
  const [term, setTerm] = useState("");
  const [manualId, setManualId] = useState("");
  const lookup = useMutation({
    mutationFn: () => search({ data: { term } }),
    onError: (error) => toast.error(userMessage(error, "Não foi possível buscar no Google.")),
  });
  const choose = (place: GooglePlaceResult | { placeId: string; name: null }) =>
    onChange({
      placeId: place.placeId,
      placeName:
        place.name === null
          ? null
          : [place.name, "address" in place ? place.address : ""].filter(Boolean).join(" — "),
      inviteActive: value.inviteActive,
    });
  const manualValid = GOOGLE_PLACE_ID.test(manualId.trim());
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        O convite aparece para todas as avaliações, com qualquer nota, conforme as regras do Google.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (term.trim().length >= 3) lookup.mutate();
        }}
      >
        <label className="flex-1 text-sm font-medium">
          Nome do cartório e cidade
          <Input
            className="mt-1.5"
            value={term}
            maxLength={120}
            placeholder="Ex.: 2º Tabelionato de Notas Curitiba"
            onChange={(event) => setTerm(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          disabled={lookup.isPending || term.trim().length < 3}
        >
          <Search />
          {lookup.isPending ? "Buscando..." : "Buscar no Google"}
        </Button>
      </form>
      {lookup.data && (
        <div className="mt-3 grid gap-2" aria-live="polite">
          {lookup.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum resultado. Tente incluir o bairro ou a cidade.
            </p>
          ) : (
            lookup.data.map((place) => (
              <button
                key={place.placeId}
                type="button"
                aria-pressed={value.placeId === place.placeId}
                disabled={busy}
                onClick={() => choose(place)}
                className="min-h-11 rounded-lg border p-3 text-left text-sm hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span className="block font-medium">{place.name}</span>
                <span className="block text-xs text-muted-foreground">{place.address}</span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
        {value.placeId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="block text-xs text-muted-foreground">Perfil escolhido</span>
              <span className="font-medium">{value.placeName ?? value.placeId}</span>
            </span>
            <span className="flex gap-2">
              <Button asChild variant="link" size="sm">
                <a href={googleReviewUrl(value.placeId)} target="_blank" rel="noopener noreferrer">
                  Conferir no Google
                  <ExternalLink aria-hidden="true" />
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onChange({ placeId: null, placeName: null, inviteActive: false })}
              >
                Remover
              </Button>
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Nenhum perfil do Google escolhido.</span>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium">Avançado: colar o código do perfil</summary>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium">
            Place ID do Google
            <Input
              className="mt-1.5 font-mono"
              value={manualId}
              maxLength={300}
              placeholder="ChIJ..."
              onChange={(event) => setManualId(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!manualValid || busy}
            onClick={() => choose({ placeId: manualId.trim(), name: null })}
          >
            Usar este código
          </Button>
        </div>
      </details>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">
            Convidar avaliantes a publicar também no Google
          </span>
          <span className="block text-xs text-muted-foreground">
            {value.placeId
              ? "Depois de enviar a avaliação, o cidadão pode abrir a página do Google em um toque."
              : "Escolha o perfil do Google acima para ligar o convite."}
          </span>
        </span>
        <Switch
          checked={value.inviteActive}
          disabled={!value.placeId || busy}
          onCheckedChange={(inviteActive) => onChange({ ...value, inviteActive })}
        />
      </label>
    </div>
  );
}
