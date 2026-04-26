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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { sessionId } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: "sessionId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", user.id).single();
    if (!session) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: tasks } = await supabase.from("agent_tasks").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
    const { data: mission } = await supabase.from("missions").select("name, target, scope").eq("id", session.mission_id).single();

    const transcript = (tasks || []).map((t: any) =>
      `[${t.agent_codename}] (grade ${t.grade}, ${t.findings_count} signals)\nUser asked: ${t.title}\nAgent: ${t.result?.slice(0, 600)}\n`
    ).join("\n---\n");

    const systemPrompt = `You are Commander, the strategic manager of an offensive security agent team. Generate an honest after-action report from the session transcript. Be concise and tactical.`;
    const userPrompt = `Mission: ${mission?.name}  Target: ${mission?.target}\nTasks: ${tasks?.length || 0}  Findings signals: ${session.findings_count}\n\nTRANSCRIPT:\n${transcript || "(no activity)"}\n\nReturn ONLY JSON via the tool.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "session_report",
            description: "Structured after-action report",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence executive summary" },
                grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
                grade_score: { type: "integer", minimum: 0, maximum: 100 },
                grade_notes: { type: "string" },
                lessons_learned: { type: "string", description: "Markdown bullets — what we learned" },
                automations_suggested: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      agent_codename: { type: "string", enum: ["PHANTOM", "VIPER", "SPECTER"] },
                      name: { type: "string" },
                      description: { type: "string" },
                      prompt_template: { type: "string", description: "Reusable prompt with {target} placeholder" },
                      category: { type: "string" },
                    },
                    required: ["agent_codename", "name", "prompt_template"],
                  },
                },
                next_missions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { title: { type: "string" }, rationale: { type: "string" } },
                    required: ["title"],
                  },
                },
              },
              required: ["summary", "grade", "grade_score", "lessons_learned"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "session_report" } },
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
    const report = args ? JSON.parse(args) : null;
    if (!report) throw new Error("No report generated");

    await supabase.from("sessions").update({
      summary: report.summary,
      lessons_learned: report.lessons_learned,
      automations_suggested: report.automations_suggested || [],
      next_missions: report.next_missions || [],
      grade: session.manual_grade_override ? session.grade : report.grade,
      grade_score: session.manual_grade_override ? session.grade_score : report.grade_score,
      grade_notes: report.grade_notes,
    }).eq("id", sessionId);

    return new Response(JSON.stringify({ report }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("session-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
