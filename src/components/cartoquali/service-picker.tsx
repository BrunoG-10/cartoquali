import { Button } from "@/components/ui/button";
import type { ServiceStepGroup } from "@/lib/service-step";

export type ServiceChoice = { serviceId?: string; serviceOther?: boolean };

// "Qual serviço você utilizou hoje?" — optional; large buttons grouped by attribution.
export function ServicePicker({
  groups,
  onChoose,
}: {
  groups: ServiceStepGroup[];
  onChoose(choice: ServiceChoice): void;
}) {
  return (
    <div className="text-left">
      <h1 className="text-center font-display text-2xl font-bold">
        Qual serviço você utilizou hoje?
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Opcional. Ajuda o cartório a saber onde melhorar.
      </p>
      <div className="mt-6 space-y-5">
        {groups.map((group) => (
          <section key={group.attribution} aria-label={group.label}>
            {groups.length > 1 && (
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
            )}
            <div className="grid gap-2">
              {group.services.map((service) => (
                <Button
                  key={service.id}
                  variant="outline"
                  className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left"
                  onClick={() => onChoose({ serviceId: service.id })}
                >
                  {service.name}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="min-h-12"
          onClick={() => onChoose({ serviceOther: true })}
        >
          Outro serviço
        </Button>
        <Button variant="ghost" className="min-h-12" onClick={() => onChoose({})}>
          Pular
        </Button>
      </div>
    </div>
  );
}
