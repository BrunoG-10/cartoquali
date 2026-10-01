import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cartoquali/app-shell";

export const Route=createFileRoute("/relatorios")({component:()=> <AppShell><Outlet/></AppShell>});
