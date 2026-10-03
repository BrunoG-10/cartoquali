import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/components/cartoquali/auth-provider";
import { AuthAccessState } from "@/components/cartoquali/auth-pages";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: ProtectedOutlet,
});

function ProtectedOutlet(){const {status}=useAuth();return status==="authenticated"?<Outlet/>:<AuthAccessState/>;}
