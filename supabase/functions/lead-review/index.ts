import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAD_PROFILE: Record<string, string> = {
  PHANTOM: "Recon Lead — OSINT, subdomain enum, DNS, port scan, asset discovery.",
  VIPER:   "Exploit Lead — vuln testing, payload crafting, web/API attacks, PoC dev.",
  SPECTER: "Stealth Lead — evasion, WAF bypass, persistence, lateral movement.",
  COMMANDER: "Strategic manager — orchestration, delegation, after-action grading.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { sessionId, agentCodename } = await req.json();
    if (!sessionId || !agentCodename) {
      return new Response(JSON.stringify({ error: "sessionId and agentCodename required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const codename = String(agentCodename).toUpperCase();

    const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single();
    if (!session) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tasks } = await supabase
      .from("agent_tasks").select("*")
      .eq("session_id", sessionId).eq("user_id", user.id).eq("agent_codename", codename)
      .order("created_at", { ascending: true });

    const transcript = (tasks || []).map((t: any) =>
      `Task: ${t.title}\nResult: ${(t.result || "").slice(0, 700)}\n`
    ).join("\n---\n") || "(no direct tasks for this lead in this session)";

    const profile = LEAD_PROFILE[codename] || `${codename} — specialty lead`;

    const systemPrompt = `You are ${codename}, a specialized lead in an offensive security agent team. ${profile}
You are reviewing your performance in the just-completed session and proposing concrete, reusable AUTOMATIONS for your future self. Each automation must be in YOUR domain only — do not propose work outside your specialty.
Quality bar: each automation must be specific (real tools, real flags, real payloads), parameterized with {target}, and immediately usable.`;

    const userPrompt = `Session summary: ${session.summary || "(none)"}
Key topic: ${session.key_topic || "—"}
Your insights: ${JSON.stringify(session.agent_insights?.[codename] || {})}

Your activity in this session:
${transcript}

Produce 2-4 high-value reusable automations for ${codename}.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "lead_review",
            description: "Lead's self-review and proposed automations",
            parameters: {
              type: "object",
              properties: {
                review: { type: "string", description: "Short honest self-review (2-4 sentences) of how this lead performed." },
                automations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      prompt_template: { type: "string", description: "Reusable prompt with {target} placeholder. Includes exact tools, flags, expected output." },
                      category: { type: "string" },
                    },
                    required: ["name", "prompt_template"],
                  },
                },
              },
              required: ["review", "automations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "lead_review" } },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }
    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const review = args ? JSON.parse(args) : null;
    if (!review) throw new Error("No review generated");

    const rows = (review.automations || []).slice(0, 6).map((a: any) => ({
      user_id: user.id,
      agent_codename: codename,
      name: String(a.name || "Untitled").slice(0, 200),
      description: a.description || null,
      prompt_template: String(a.prompt_template || "").slice(0, 4000),
      category: a.category || "lead-review",
      source: "ai",
      status: "pending",
      metadata: { from_session: sessionId, review: review.review },
    }));

    let inserted: any[] = [];
    if (rows.length) {
      const { data: ins } = await supabase.from("automations").insert(rows).select();
      inserted = ins || [];
    }

    return new Response(JSON.stringify({ review: review.review, automations: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
