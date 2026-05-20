import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Helm — AI Workplace Productivity Assistant" },
      {
        name: "description",
        content:
          "Helm is your AI executive assistant for tasks, meetings, email, and project workflows.",
      },
      { property: "og:title", content: "Helm — AI Workplace Productivity Assistant" },
      { name: "twitter:title", content: "Helm — AI Workplace Productivity Assistant" },
      { name: "description", content: "WorkWise Assistant is an AI-powered tool that enhances workplace efficiency and organization." },
      { property: "og:description", content: "WorkWise Assistant is an AI-powered tool that enhances workplace efficiency and organization." },
      { name: "twitter:description", content: "WorkWise Assistant is an AI-powered tool that enhances workplace efficiency and organization." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4fb1499b-a02e-4f52-a5f6-7e870216f149/id-preview-b434f5d4--4e3f7f88-0659-45e8-b728-1230cc89404a.lovable.app-1779263263918.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4fb1499b-a02e-4f52-a5f6-7e870216f149/id-preview-b434f5d4--4e3f7f88-0659-45e8-b728-1230cc89404a.lovable.app-1779263263918.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Go home
        </Link>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
