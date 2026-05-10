import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hand a Commander review item off to a Lead:
//  - records the handoff in sessions.agent_insights[lead].handoffs
//  - appends the takeaway to that lead's improvements list (so it shows in their Memory)
//  - if a suggested_skill is provided, persists it as an automation owned by that lead
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { sessionId, targetLead, item } = await req.json();
    const lead = String(targetLead || "").toUpperCase();
    if (!sessionId || !lead || !item?.text) {
      return new Response(JSON.stringify({ error: "sessionId, targetLead, and item.text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["PHANTOM", "VIPER", "SPECTER", "COMMANDER"].includes(lead)) {
      return new Response(JSON.stringify({ error: "Invalid targetLead" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session } = await supabase.from("sessions").select("agent_insights,title").eq("id", sessionId).eq("user_id", user.id).single();
    if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const insights = { ...(session.agent_insights || {}) };
    const leadIns = { ...(insights[lead] || {}) };
    leadIns.handoffs = Array.isArray(leadIns.handoffs) ? [...leadIns.handoffs] : [];
    leadIns.handoffs.push({ text: item.text, severity: item.severity || "medium", from: "COMMANDER", at: new Date().toISOString() });
    leadIns.improvements = Array.isArray(leadIns.improvements) ? [...leadIns.improvements] : [];
    leadIns.improvements.push(`[Commander] ${item.text}`);
    insights[lead] = leadIns;

    await supabase.from("sessions").update({ agent_insights: insights }).eq("id", sessionId);

    let savedSkill: any = null;
    if (item.suggested_skill?.prompt_template) {
      const skill = item.suggested_skill;
      const { data: ins } = await supabase.from("automations").insert({
        user_id: user.id,
        agent_codename: lead,
        name: String(skill.name || `Handoff: ${item.text.slice(0, 60)}`).slice(0, 200),
        description: `Commander handoff from session "${session.title}"`,
        prompt_template: String(skill.prompt_template).slice(0, 4000),
        category: skill.category || "commander-handoff",
        source: "ai",
        status: "approved",
        metadata: { from_session: sessionId, handoff_text: item.text },
      }).select().single();
      savedSkill = ins;
    }

    return new Response(JSON.stringify({ ok: true, lead, skill: savedSkill }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pass-to-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
