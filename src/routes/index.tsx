import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Top-level "/" — bounce based on auth. The actual landing is _authenticated/index.
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    // Authenticated: let _authenticated/index resolve threads
  },
  component: () => null,
});
