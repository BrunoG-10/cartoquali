import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  copyComment,
  openGoogleReview,
  rememberInvite,
  wasInvitedRecently,
} from "@/lib/google-review";

/**
 * Convite para publicar também no Google. Política do Google: o mesmo texto, cor e posição para
 * qualquer nota — este componente nem recebe a nota. Não sugere texto: só copia o comentário que
 * o próprio cidadão escreveu, e o cidadão publica (ou não) no Google.
 */
export function GoogleInvite({
  placeId,
  comment,
  onOpened,
}: {
  placeId: string;
  /** O comentário digitado pelo cidadão, sem alterações; vazio quando não houve. */
  comment: string;
  /** Registro do clique, sem esperar resposta. */
  onOpened(): void;
}) {
  const [state, setState] = useState<"invite" | "opened" | "closed">(() =>
    wasInvitedRecently(placeId) ? "closed" : "invite",
  );
  if (state === "closed") return null;
  if (state === "opened")
    return (
      <div role="status" className="mt-6 rounded-lg border border-border p-4 text-sm">
        Obrigado! Se o texto não colar, é só escrever direto no Google.
      </div>
    );
  const hasComment = comment.trim().length > 0;
  // Everything runs synchronously inside the click, or Safari on iOS blocks the copy and the tab.
  const publish = () => {
    if (hasComment) copyComment(comment.trim());
    onOpened();
    rememberInvite(placeId);
    setState("opened");
    openGoogleReview(placeId);
  };
  const dismiss = () => {
    rememberInvite(placeId);
    setState("closed");
  };
  return (
    <section
      aria-labelledby="google-invite-title"
      className="mt-6 rounded-lg border border-border p-4 text-left"
    >
      <h2 id="google-invite-title" className="font-display text-lg font-bold">
        {hasComment
          ? "Quer deixar sua opinião também no Google?"
          : "Quer marcar suas estrelas também no Google?"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasComment
          ? "Seu comentário será copiado. É só marcar as estrelas e colar."
          : "Leva poucos segundos."}
      </p>
      {/* Same size and position for both choices: declining is as easy as accepting. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button className="min-h-12 w-full whitespace-normal" onClick={publish}>
          Publicar no Google
          <ExternalLink aria-hidden="true" />
          <span className="sr-only"> (abre em nova aba)</span>
        </Button>
        <Button className="min-h-12 w-full" variant="outline" onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </section>
  );
}
