import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OVERVIEW_SCHEMA_HINT = `Respond ONLY with a single JSON object inside a \`\`\`json code block, no prose.
{
  "summary": "<2-4 sentences summarising what you (this agent) did and learned this session>",
  "high":   [{ "title": "<short>", "body": "<why this matters>" }],
  "medium": [{ "title": "<short>", "body": "<why this matters>" }],
  "low":    [{ "title": "<short>", "body": "<why this matters>" }],
  "opinions": [{ "topic": "<short topic>", "body": "<your specialty-based opinion>" }],
  "recommendations": [
    { "kind": "workflow|automation|skill", "title": "<short>", "body": "<markdown describing the workflow/automation, or a skill.md frontmatter+body>" }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { sessionId, missionId, conversationId, agentCodenames } = await req.json();
    if (!Array.isArray(agentCodenames) || agentCodenames.length === 0) {
      return new Response(JSON.stringify({ error: "agentCodenames required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ownership check
    const { data: convo } = await supabase.from("conversations").select("id,mission_id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!convo) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const resolvedMissionId = missionId || convo.mission_id;

    // Recent transcript context (last 60 messages)
    const { data: msgs } = await supabase
      .from("messages").select("role, sender_name, content, created_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(60);

    const transcript = (msgs || []).map((m) => `[${m.sender_name}] ${m.content}`).join("\n");

    const perAgent: any[] = [];

    for (const raw of agentCodenames) {
      const codename = String(raw).toUpperCase().trim();
      if (!codename) continue;

      const sys = `You are ${codename}. Produce an END-OF-SESSION OVERVIEW from your perspective and specialty. Be concrete, no fluff.\n${OVERVIEW_SCHEMA_HINT}`;
      const userPrompt = `Session transcript:\n\n${transcript}\n\nNow emit the JSON overview for ${codename}.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: userPrompt }],
          max_tokens: 1500,
        }),
      });
      if (!aiResp.ok) {
        perAgent.push({ codename, ok: false, error: `AI error ${aiResp.status}` });
        continue;
      }
      const aiData = await aiResp.json();
      const content: string = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/(\{[\s\S]*\})/);
      let parsed: any = null;
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { /* ignore */ }
      }
      if (!parsed) {
        perAgent.push({ codename, ok: false, error: "Failed to parse JSON" });
        continue;
      }

      // Insert rows
      if (parsed.summary) {
        await supabase.from("agent_memory").insert({
          user_id: user.id, mission_id: resolvedMissionId, session_id: sessionId || null,
          agent_codename: codename, summary: String(parsed.summary).slice(0, 4000),
        });
      }
      const levelRows: any[] = [];
      for (const level of ["high", "medium", "low"] as const) {
        for (const item of Array.isArray(parsed[level]) ? parsed[level].slice(0, 10) : []) {
          if (!item?.title) continue;
          levelRows.push({
            user_id: user.id, mission_id: resolvedMissionId, session_id: sessionId || null,
            agent_codename: codename, level,
            title: String(item.title).slice(0, 200),
            body: item.body ? String(item.body).slice(0, 2000) : null,
          });
        }
      }
      if (levelRows.length) await supabase.from("agent_learnings").insert(levelRows);

      const opRows = (Array.isArray(parsed.opinions) ? parsed.opinions.slice(0, 10) : [])
        .filter((o: any) => o?.body)
        .map((o: any) => ({
          user_id: user.id, session_id: sessionId || null, agent_codename: codename,
          topic: o.topic ? String(o.topic).slice(0, 200) : null,
          body: String(o.body).slice(0, 2000),
        }));
      if (opRows.length) await supabase.from("agent_opinions").insert(opRows);

      const recRows = (Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 10) : [])
        .filter((r: any) => r?.title && ["workflow", "automation", "skill"].includes(r.kind))
        .map((r: any) => ({
          user_id: user.id, session_id: sessionId || null, agent_codename: codename,
          kind: r.kind, title: String(r.title).slice(0, 200),
          body: r.body ? String(r.body).slice(0, 4000) : null,
          status: "pending",
        }));
      if (recRows.length) await supabase.from("agent_recommendations").insert(recRows);

      // Post a short note into the conversation
      await supabase.from("messages").insert({
        conversation_id: conversationId, user_id: user.id,
        role: codename === "COMMANDER" ? "manager" : "lead",
        sender_name: `${codename} (End-of-Session)`,
        content: `📋 End-of-session overview saved.\n\n${parsed.summary || ""}\n\nLearnings: ${levelRows.length} · Opinions: ${opRows.length} · Recs: ${recRows.length}`,
      });

      perAgent.push({
        codename, ok: true,
        counts: { learnings: levelRows.length, opinions: opRows.length, recommendations: recRows.length, memory: parsed.summary ? 1 : 0 },
      });
    }

    return new Response(JSON.stringify({ ok: true, perAgent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-session-overview error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
