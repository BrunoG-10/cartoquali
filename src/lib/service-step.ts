import { ATTRIBUTIONS } from "@/lib/attributions";

export type ServiceStepGroup = {
  attribution: string;
  label: string;
  services: Array<{ id: string; name: string }>;
};

export type ServiceStep =
  { show: false; autoServiceId: string | null } | { show: true; groups: ServiceStepGroup[] };

// "Qual serviço você utilizou hoje?" only appears when there is a real choice: with no services the
// step is skipped, and with a single active service it is recorded without asking.
export function resolveServiceStep(
  services: Array<{ id: string; name: string; attribution: string }>,
): ServiceStep {
  if (services.length === 0) return { show: false, autoServiceId: null };
  if (services.length === 1) return { show: false, autoServiceId: services[0]!.id };
  const groups = ATTRIBUTIONS.map((attribution) => ({
    attribution: attribution.key as string,
    label: attribution.label,
    services: services
      .filter((service) => service.attribution === attribution.key)
      .map(({ id, name }) => ({ id, name })),
  })).filter((group) => group.services.length > 0);
  return { show: true, groups };
}
