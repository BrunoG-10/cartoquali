import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { AuthAccessState } from "@/components/cartoquali/auth-pages";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Navigation guard only: reads the local session (no network round trip per page change).
  // Authorization stays server-side — every server function validates the token, and the
  // AuthProvider re-validates the user with Supabase in the background.
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  component: ProtectedOutlet,
});

function ProtectedOutlet() {
  const { status } = useAuth();
  return status === "authenticated" ? <Outlet /> : <AuthAccessState />;
}
