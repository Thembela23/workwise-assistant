import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  loader: async () => {
    const threads = await listThreads();
    if (threads.length > 0) {
      throw redirect({ to: "/chat/$threadId", params: { threadId: threads[0].id } });
    }
    const t = await createThread();
    throw redirect({ to: "/chat/$threadId", params: { threadId: t.id } });
  },
  component: () => null,
});
