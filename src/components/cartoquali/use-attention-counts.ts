import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttentionCounts } from "@/lib/evaluations.functions";

export const ATTENTION_COUNTS_KEY = ["attention-counts"] as const;

/** Pendências do cartório (retornos e avaliações ruins), compartilhadas entre Painel e menu. */
export function useAttentionCounts() {
  const load = useServerFn(getAttentionCounts);
  return useQuery({
    queryKey: ATTENTION_COUNTS_KEY,
    queryFn: () => load(),
    staleTime: 60_000,
  });
}
