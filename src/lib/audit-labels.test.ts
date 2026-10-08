import { describe, expect, it } from "vitest";
import { AUDIT_ACTION_LABELS, auditActionLabel } from "./audit-labels";

describe("auditActionLabel", () => {
  it("translates known actions", () => {
    expect(auditActionLabel("question_updated")).toBe("Pergunta alterada");
    expect(auditActionLabel("occurrence_created")).toBe("Ocorrência criada");
    expect(auditActionLabel("CARTORIO_ACTIVATED")).toBe("Cartório ativado");
    expect(auditActionLabel("user_role_assigned")).toBe("Perfil atribuído ao usuário");
  });

  it("falls back to the raw code for unknown actions", () => {
    expect(auditActionLabel("something_new")).toBe("something_new");
  });

  it("has a label for every action written by the database today", () => {
    for (const code of [
      "evaluation_point_deactivated",
      "evaluation_point_updated",
      "improvement_plan_created",
      "occurrence_closed",
      "occurrence_status_changed",
      "question_created",
      "registry_updated",
      "registry_settings_created",
      "survey_created",
      "survey_updated",
      "user_created",
      "user_deactivated",
      "user_updated",
      "registry_attributions_updated",
      "registry_service_toggled",
    ])
      expect(AUDIT_ACTION_LABELS[code], code).toBeTruthy();
  });
});
