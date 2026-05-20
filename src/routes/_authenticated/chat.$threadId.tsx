import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/chat.functions";
import logo from "@/assets/helm-logo.png";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  return <ChatWindow key={threadId} threadId={threadId} />;
}

function ChatWindow({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const { data: initial = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => getThreadMessages({ data: { threadId } }),
  });

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      initial.map((m) => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: JSON.parse(m.parts) as UIMessage["parts"],
      })),
    [initial],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(init?.headers);
          if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: threadId,
    transport,
  });

  // hydrate from db on mount / thread change
  const hydrated = useRef<string | null>(null);
  useEffect(() => {
    if (hydrated.current !== threadId && initialMessages.length > 0) {
      setMessages(initialMessages);
      hydrated.current = threadId;
    }
  }, [initialMessages, threadId, setMessages]);

  // invalidate thread list after a response finishes (title may have updated)
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      qc.invalidateQueries({ queryKey: ["threads"] });
    }
  }, [status, messages.length, qc]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const text = String(fd.get("message") ?? "").trim();
    if (!text) return;
    sendMessage({ text });
    form.reset();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
          {empty && (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center">
              <img src={logo} alt="" width={64} height={64} className="opacity-90" />
              <h2 className="mt-4 text-xl font-semibold tracking-tight">
                How can I help you today?
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask me to plan your day, draft an email, summarize a meeting, or break a project
                into clear next steps.
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-lg border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    onClick={() => sendMessage({ text: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {(status === "submitted" || status === "streaming") &&
            messages[messages.length - 1]?.role === "user" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={inputRef}
              name="message"
              placeholder="Message Helm — ask anything about your work…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Helm can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Plan my workday based on these priorities…",
  "Draft a follow-up email after today's meeting",
  "Turn these notes into clear action items",
  "Create a 4-week project timeline for…",
];
