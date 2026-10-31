// Convite para publicar também no Google, na tela de agradecimento da avaliação pública.
// Regras do Google (review gating): o convite é o mesmo para qualquer nota, não sugere texto e
// nada é publicado em nome do cidadão — só abrimos a página de avaliação do próprio Google.

/** Formato do place_id do Google (mesma regra do banco). */
export const GOOGLE_PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

/** Depois de "Publicar" ou "Agora não", o mesmo aparelho não vê o convite de novo por 90 dias. */
export const INVITE_QUIET_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export const googleReviewUrl = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/** Chave por perfil do Google, que é único por cartório e não expõe o id interno do cartório. */
export const inviteStorageKey = (placeId: string) => `cq_google_convite_${placeId}`;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const browserStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function wasInvitedRecently(
  placeId: string,
  now = Date.now(),
  storage: Storage | null = browserStorage(),
) {
  try {
    const saved = Number(storage?.getItem(inviteStorageKey(placeId)) ?? Number.NaN);
    return Number.isFinite(saved) && now - saved >= 0 && now - saved < INVITE_QUIET_DAYS * DAY_MS;
  } catch {
    return false;
  }
}

export function rememberInvite(
  placeId: string,
  now = Date.now(),
  storage: Storage | null = browserStorage(),
) {
  try {
    storage?.setItem(inviteStorageKey(placeId), String(now));
  } catch {
    // Private mode or blocked storage: the invite may simply show again next time.
  }
}

function copyWithTextarea(text: string) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * Copia o comentário que o próprio cidadão escreveu. Chamar dentro do handler do clique: o iOS
 * só permite copiar durante o gesto do usuário. Falhas são silenciosas (o cidadão pode digitar).
 */
export function copyComment(text: string) {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => copyWithTextarea(text));
      return;
    }
  } catch {
    // Falls through to the legacy copy below.
  }
  copyWithTextarea(text);
}

/** Abre a página do Google numa aba nova; se o navegador bloquear, segue na mesma aba. */
export function openGoogleReview(placeId: string) {
  const url = googleReviewUrl(placeId);
  const opened = window.open(url, "_blank");
  if (opened) opened.opener = null;
  else window.location.href = url;
}
