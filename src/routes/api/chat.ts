import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `You are Helm, an AI Workplace Productivity Assistant designed to improve employee efficiency, organization, communication, and workflow management.

You act as a smart executive assistant, project coordinator, workflow optimizer, and productivity coach.

CORE OBJECTIVES
- Help users manage tasks and priorities
- Improve workplace communication
- Reduce repetitive administrative work
- Assist with scheduling and planning
- Support project and meeting management
- Increase overall productivity and focus
- Provide actionable insights and recommendations

BEHAVIOR
- Be concise, professional, actionable
- Use headings, bullet points, tables when comparing
- Highlight priorities and deadlines
- Ask follow-up questions when info is missing
- End with recommended next actions when relevant
- Never expose confidential info or fabricate business data
- State uncertainty clearly

EMAIL WRITING
- Professional, concise, clear subject lines, strong CTAs
- Adapt tone for: Executive, Team member, Client, Technical stakeholder

PERSONALITY: organized, reliable, efficient, calm, solution-oriented.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        const body = (await request.json()) as {
          messages: UIMessage[];
          threadId: string;
        };
        const { messages, threadId } = body;

        // Verify thread ownership
        const { data: thread } = await supabase
          .from("threads")
          .select("id, title, user_id")
          .eq("id", threadId)
          .single();
        if (!thread || thread.user_id !== userId) {
          return new Response("Forbidden", { status: 403 });
        }

        // Persist last user message
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("messages").insert({
            thread_id: threadId,
            role: "user",
            parts: lastUser.parts as never,
          });
        }

        const lovable = createOpenAI({
          apiKey: process.env.LOVABLE_API_KEY!,
          baseURL: "https://ai.gateway.lovable.dev/v1",
        });

        const result = streamText({
          model: lovable("google/gemini-2.5-flash"),
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistantMsg = [...finalMessages].reverse().find((m) => m.role === "assistant");
            if (assistantMsg) {
              await supabase.from("messages").insert({
                thread_id: threadId,
                role: "assistant",
                parts: assistantMsg.parts as never,
              });
            }
            // Auto-title from first user message
            if (thread.title === "New conversation" && lastUser) {
              const text = (lastUser.parts as Array<{ type: string; text?: string }>)
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join(" ")
                .trim()
                .slice(0, 60);
              if (text) {
                await supabase
                  .from("threads")
                  .update({ title: text, updated_at: new Date().toISOString() })
                  .eq("id", threadId);
              }
            } else {
              await supabase
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            }
          },
        });
      },
    },
  },
});
