import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/cartoquali/onboarding-page";

export const Route = createFileRoute("/_authenticated/implantacoes")({ component: OnboardingPage });