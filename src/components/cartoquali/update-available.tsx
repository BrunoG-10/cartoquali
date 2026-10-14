import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNewVersion, loadedSignature, publishedSignature } from "@/lib/app-version";

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Kept per tab across screens: every page mounts its own AppShell.
let detected = false;
let lastCheckedAt = 0;

/** True once the server publishes a version different from the one running in this tab. */
function useNewVersionAvailable() {
  const [available, setAvailable] = useState(detected);
  useEffect(() => {
    // Dev server pages have no hashed entry, so there is nothing to compare.
    const current = loadedSignature(document);
    if (!current || available) return;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      lastCheckedAt = Date.now();
      try {
        if (isNewVersion(current, await publishedSignature())) {
          detected = true;
          if (!stopped) setAvailable(true);
        }
      } catch {
        // Offline or a failed deploy: try again on the next check.
      }
    };
    if (Date.now() - lastCheckedAt >= CHECK_EVERY_MS) void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [available]);
  return available;
}

/**
 * Balloon offering the new version. Reloading keeps the user signed in (the session is stored in
 * the browser) and on the same screen (the URL is kept).
 */
export function UpdateAvailable() {
  const available = useNewVersionAvailable();
  if (!available) return null;
  return (
    <div
      role="status"
      data-print="hide"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-xl sm:left-auto sm:right-6 sm:mx-0"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <RefreshCw className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Nova versão do CartoQuali disponível</p>
        <p className="text-xs text-muted-foreground">
          Atualize para receber as melhorias. Você continua conectado e nesta tela.
        </p>
      </div>
      <Button size="sm" onClick={() => window.location.reload()}>
        Atualizar agora
      </Button>
    </div>
  );
}
