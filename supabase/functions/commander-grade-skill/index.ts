import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { automationIds } = await req.json();
    const ids: string[] = Array.isArray(automationIds) ? automationIds.filter(Boolean) : [];
    if (!ids.length) return new Response(JSON.stringify({ error: "automationIds[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: autos } = await supabase.from("automations").select("*").in("id", ids).eq("user_id", user.id);
    if (!autos || !autos.length) return new Response(JSON.stringify({ error: "No skills found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const graded: any[] = [];
    for (const a of autos) {
      const sys = `You are COMMANDER, the strategic mission manager of an offensive-security agent fleet (PHANTOM=Recon, VIPER=Exploit, SPECTER=Stealth, CARTOGRAPHER=Mapping).
A lead has proposed a new reusable skill/automation. Grade it RUTHLESSLY but fairly on three axes:
1) implementable_today — Can we run this RIGHT NOW with the tools/infra/data we have? (1=no, 5=trivial)
2) team_relevant — Does this fit our team's offensive bug-bounty hunt process? (1=off-topic, 5=core)
3) scaling_potential — How can we leverage this skill into MORE areas of our hunt? Be concrete. (1=narrow, 5=high leverage)
Respond ONLY via the function call.`;
      const usr = `Proposed by: ${a.agent_codename}
Name: ${a.name}
Category: ${a.category || "—"}
Description: ${a.description || "—"}
Prompt template:
${a.prompt_template}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          tools: [{
            type: "function",
            function: {
              name: "grade_skill",
              parameters: {
                type: "object",
                properties: {
                  implementable_today: { type: "object", properties: { score: { type: "integer", minimum: 1, maximum: 5 }, note: { type: "string" } }, required: ["score", "note"] },
                  team_relevant:       { type: "object", properties: { score: { type: "integer", minimum: 1, maximum: 5 }, note: { type: "string" } }, required: ["score", "note"] },
                  scaling_potential:   { type: "object", properties: { score: { type: "integer", minimum: 1, maximum: 5 }, note: { type: "string" }, scaling_ideas: { type: "array", items: { type: "string" } } }, required: ["score", "note", "scaling_ideas"] },
                  verdict:             { type: "string", enum: ["recommend_approve", "recommend_edit", "recommend_reject"] },
                  verdict_reason:      { type: "string" },
                },
                required: ["implementable_today", "team_relevant", "scaling_potential", "verdict", "verdict_reason"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "grade_skill" } },
        }),
      });

      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!aiResp.ok) { console.error("AI error:", aiResp.status, await aiResp.text()); continue; }

      const data = await aiResp.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const grade = args ? JSON.parse(args) : null;
      if (!grade) continue;

      const total = (grade.implementable_today.score + grade.team_relevant.score + grade.scaling_potential.score);
      const meta = { ...(a.metadata || {}), commander_grade: { ...grade, total, graded_at: new Date().toISOString() } };
      const { data: upd } = await supabase.from("automations").update({ metadata: meta, status: "commander_reviewed" }).eq("id", a.id).select().single();
      if (upd) graded.push(upd);
    }

    return new Response(JSON.stringify({ ok: true, graded }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("commander-grade-skill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
