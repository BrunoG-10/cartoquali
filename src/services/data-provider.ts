import { DATA_PROVIDER } from "@/constants/cartoquali";
import { mockCartoQualiService, mockSnapshot } from "@/data/mock-service";
import type { CartoQualiService } from "@/services/cartoquali-service";
import type { CartoQualiSnapshot, DataProviderKind } from "@/types/cartoquali";

export type CartoQualiDataProvider = {
  kind: DataProviderKind;
  service: CartoQualiService;
  getInitialSnapshot(): CartoQualiSnapshot;
};

const providers: Record<"mock", CartoQualiDataProvider> = {
  mock: {
    kind: "mock",
    service: mockCartoQualiService,
    getInitialSnapshot: () => structuredClone(mockSnapshot),
  },
};

export function getDataProvider(kind: DataProviderKind = DATA_PROVIDER): CartoQualiDataProvider {
  if (kind === "api") throw new Error("O provedor de API ainda não foi implementado.");
  return providers.mock;
}

export const activeDataProvider = getDataProvider();