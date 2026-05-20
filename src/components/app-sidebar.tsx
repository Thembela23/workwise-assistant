import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Trash2, LogOut, MoreHorizontal } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";
import { toast } from "sonner";
import logo from "@/assets/helm-logo.png";

type Thread = { id: string; title: string; updated_at: string };

export function AppSidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useRouterState({
    select: (r) => r.matches.find((m) => m.routeId === "/_authenticated/chat/$threadId")?.params,
  }) as { threadId?: string } | undefined;
  const activeId = params?.threadId;

  const [email, setEmail] = useState<string>("");
  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreads(),
  });

  const create = useMutation({
    mutationFn: () => createThread(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { id } }),
    onSuccess: async (_d, id) => {
      await qc.invalidateQueries({ queryKey: ["threads"] });
      if (activeId === id) {
        const rest = (qc.getQueryData<Thread[]>(["threads"]) ?? []).filter((t) => t.id !== id);
        if (rest[0]) navigate({ to: "/chat/$threadId", params: { threadId: rest[0].id } });
        else navigate({ to: "/" });
      }
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-1 py-1">
          <img src={logo} alt="" width={28} height={28} className="shrink-0" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-tight">Helm</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Workplace AI
            </span>
          </div>
        </div>
        <Button
          size="sm"
          className="mt-2 w-full group-data-[collapsible=icon]:hidden"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <MessageSquarePlus className="h-4 w-4" /> New conversation
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="mt-2 hidden group-data-[collapsible=icon]:flex"
          onClick={() => create.mutate()}
          aria-label="New conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No conversations yet.</p>
              )}
              {threads.map((t) => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton asChild isActive={activeId === t.id} tooltip={t.title}>
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      className="flex w-full items-center gap-2 truncate"
                    >
                      <span className="truncate">{t.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Thread actions"
                          className="rounded p-1 hover:bg-accent"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            if (confirm(`Delete "${t.title}"?`)) {
                              del.mutate(t.id);
                              toast.success("Conversation deleted");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:hidden">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium">{email || "Signed in"}</span>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="hidden group-data-[collapsible=icon]:flex"
          onClick={signOut}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
