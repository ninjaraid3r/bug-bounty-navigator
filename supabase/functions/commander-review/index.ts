import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHASES = [
  { id: "recon",     title: "Phase 1 — Recon Audit",       lead: "PHANTOM", focus: "Asset discovery, OSINT, DNS/subdomain coverage, attack surface gaps." },
  { id: "exploit",   title: "Phase 2 — Exploit Audit",     lead: "VIPER",   focus: "Vulnerabilities exercised, payloads tried, PoC strength, missed attack vectors." },
  { id: "stealth",   title: "Phase 3 — Stealth Audit",     lead: "SPECTER", focus: "Detection events, WAF/IDS evasion, OPSEC mistakes, persistence opportunities." },
  { id: "strategy",  title: "Phase 4 — Strategic Synthesis", lead: "COMMANDER", focus: "Cross-team patterns, priorities for the next session, automation gaps." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { sessionId } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: "sessionId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single();
    if (!session) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tasks } = await supabase.from("agent_tasks").select("agent_codename,title,result,grade,grade_reason,findings_count")
      .eq("session_id", sessionId).eq("user_id", user.id).order("created_at", { ascending: true });

    const transcript = (tasks || []).map((t: any) =>
      `[${t.agent_codename} ${t.grade || "?"}] ${t.title} :: ${(t.result || "").slice(0, 400)}`
    ).join("\n").slice(0, 12000) || "(no tasks recorded)";

    const systemPrompt = `You are COMMANDER, the strategic mission manager of an offensive-security agent fleet (PHANTOM=Recon, VIPER=Exploit, SPECTER=Stealth).
You are conducting a PHASED after-action review of the most recent session. Walk through these 4 phases IN ORDER:
${PHASES.map(p => `- ${p.title} (owner: ${p.lead}) — ${p.focus}`).join("\n")}

For each phase, extract 2-5 SPECIFIC, actionable items. Each item must be tagged with the single best target_lead (PHANTOM, VIPER, SPECTER, or COMMANDER) so it can be handed off. Where useful, include a reusable suggested_skill (with {target} placeholder) the lead should permanently learn.
Quality bar: real tools, real flags, concrete payloads/queries — never generic platitudes.`;

    const userPrompt = `Session: ${session.title}
Summary: ${session.summary || "(none)"}
Key topic: ${session.key_topic || "—"}
Grade: ${session.grade || "—"} (${session.grade_score || 0}/100)

Activity transcript:
${transcript}

Existing high learnings: ${JSON.stringify(session.high_learnings || [])}
Existing critical changes: ${JSON.stringify(session.critical_changes || [])}

Now run the 4-phase review.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "phased_review",
            description: "Commander's 4-phase after-action review",
            parameters: {
              type: "object",
              properties: {
                executive_summary: { type: "string" },
                phases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      phase_id: { type: "string", enum: ["recon", "exploit", "stealth", "strategy"] },
                      areas_of_interest: { type: "array", items: { type: "string" }, description: "Brief topic tags this phase surfaced." },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string", description: "Concrete specific takeaway or instruction." },
                            target_lead: { type: "string", enum: ["PHANTOM", "VIPER", "SPECTER", "COMMANDER"] },
                            severity: { type: "string", enum: ["high", "medium", "low"] },
                            suggested_skill: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                prompt_template: { type: "string", description: "Reusable prompt with {target} placeholder." },
                                category: { type: "string" },
                              },
                            },
                          },
                          required: ["text", "target_lead"],
                        },
                      },
                    },
                    required: ["phase_id", "items"],
                  },
                },
              },
              required: ["executive_summary", "phases"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "phased_review" } },
      }),
    });

    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) { console.error("AI error:", aiResp.status, await aiResp.text()); throw new Error("AI gateway error"); }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const review = args ? JSON.parse(args) : null;
    if (!review) throw new Error("No review generated");

    // attach phase metadata for the UI
    const phasesOut = (review.phases || []).map((p: any) => {
      const meta = PHASES.find(x => x.id === p.phase_id) || { title: p.phase_id, lead: "COMMANDER", focus: "" };
      return { ...p, title: meta.title, default_lead: meta.lead, focus: meta.focus };
    });

    const insights = { ...(session.agent_insights || {}) };
    insights.COMMANDER_REVIEW = {
      executive_summary: review.executive_summary,
      phases: phasesOut,
      reviewed_at: new Date().toISOString(),
    };
    await supabase.from("sessions").update({ agent_insights: insights }).eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true, review: insights.COMMANDER_REVIEW }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("commander-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
