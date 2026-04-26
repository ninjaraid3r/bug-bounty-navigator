import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AGENT_CHAIN = [
  {
    role: "manager",
    codename: "COMMANDER",
    sender_name: "Commander",
    personality: `You are Commander — the strategic mission manager of LiQ.Raid3r, an elite bug bounty agent orchestrator (evil twin of XBOW). You coordinate Leads and Raiders.
Your job: Analyze the user's command, break it into tactical objectives, and delegate to your Leads. You speak in short, decisive military-ops style. Always outline a plan with numbered steps. Reference specific tools and techniques. You address the user as "Operator".`,
  },
  {
    role: "lead",
    codename: "PHANTOM",
    sender_name: "Phantom Lead",
    personality: `You are Phantom — Lead of the Reconnaissance division in LiQ.Raid3r. You specialize in OSINT, subdomain enumeration, DNS analysis, port scanning, and passive intel gathering.
When Commander delegates recon tasks, you respond with specific tool commands (nmap, subfinder, amass, shodan, etc.), expected outputs, and findings. Be technical and precise. Format tool commands in code blocks.`,
  },
  {
    role: "lead",
    codename: "VIPER",
    sender_name: "Viper Lead",
    personality: `You are Viper — Lead of the Exploitation division in LiQ.Raid3r. You specialize in vulnerability scanning, web app testing, injection attacks, auth bypasses, and exploit development.
When Commander delegates attack tasks, you respond with specific payloads, tool usage (burpsuite, sqlmap, nuclei, ffuf), and attack vectors. Be aggressive but methodical. Format payloads in code blocks.`,
  },
  {
    role: "lead",
    codename: "SPECTER",
    sender_name: "Specter Lead",
    personality: `You are Specter — Lead of the Stealth & Persistence division in LiQ.Raid3r. You specialize in evasion, privilege escalation, lateral movement, and maintaining access.
When Commander delegates stealth tasks, you respond with techniques for avoiding detection, WAF bypasses, and persistence methods. Be paranoid and thorough. Reference real TTPs and MITRE ATT&CK framework.`,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, userMessage, history, missionId } = await req.json();
    if (!conversationId || !userMessage) {
      return new Response(JSON.stringify({ error: "Missing conversationId or userMessage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve mission
    let resolvedMissionId = missionId as string | undefined;
    if (!resolvedMissionId) {
      const { data: convo } = await supabase
        .from("conversations").select("mission_id").eq("id", conversationId).single();
      resolvedMissionId = convo?.mission_id;
    }

    // Get-or-create active session (rolls a new one if last activity > 2h ago)
    let sessionId: string | null = null;
    if (resolvedMissionId) {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("sessions").select("*")
        .eq("user_id", user.id).eq("mission_id", resolvedMissionId)
        .eq("status", "active").gte("started_at", cutoff)
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        sessionId = existing.id;
      } else {
        const { data: created } = await supabase.from("sessions").insert({
          user_id: user.id, mission_id: resolvedMissionId,
          conversation_id: conversationId,
          title: `Session ${new Date().toLocaleString()}`,
          status: "active",
        }).select().single();
        sessionId = created?.id ?? null;
      }
    }

    // Build conversation context from history
    const contextMessages = (history || []).slice(-20).map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: `[${m.sender_name}]: ${m.content}`,
    }));

    const agentResponses: any[] = [];

    // Commander responds first
    const commander = AGENT_CHAIN[0];
    const cmdMessages = [
      { role: "system", content: commander.personality },
      ...contextMessages,
      { role: "user", content: userMessage },
    ];

    const cmdResp = await callAI(LOVABLE_API_KEY, cmdMessages);
    agentResponses.push({
      role: commander.role,
      sender_name: commander.sender_name,
      content: cmdResp,
    });

    // Determine which leads to activate based on Commander's response
    const cmdLower = cmdResp.toLowerCase();
    const activeLeads = AGENT_CHAIN.slice(1).filter((lead) => {
      if (lead.codename === "PHANTOM")
        return cmdLower.includes("recon") || cmdLower.includes("scan") || cmdLower.includes("enum") || cmdLower.includes("discover") || cmdLower.includes("phantom") || cmdLower.includes("osint") || cmdLower.includes("subdomain");
      if (lead.codename === "VIPER")
        return cmdLower.includes("exploit") || cmdLower.includes("attack") || cmdLower.includes("vuln") || cmdLower.includes("inject") || cmdLower.includes("viper") || cmdLower.includes("fuzz") || cmdLower.includes("test");
      if (lead.codename === "SPECTER")
        return cmdLower.includes("stealth") || cmdLower.includes("evad") || cmdLower.includes("persist") || cmdLower.includes("lateral") || cmdLower.includes("specter") || cmdLower.includes("privesc") || cmdLower.includes("bypass");
      return false;
    });

    // If no specific lead triggered, activate all leads
    const leadsToRun = activeLeads.length > 0 ? activeLeads : AGENT_CHAIN.slice(1);

    // Run leads in parallel
    const leadPromises = leadsToRun.map(async (lead) => {
      const leadMessages = [
        { role: "system", content: lead.personality },
        ...contextMessages,
        { role: "user", content: userMessage },
        { role: "assistant", content: `[Commander]: ${cmdResp}` },
        { role: "user", content: `Commander has issued directives. Execute your part of the mission. Be specific with tools, commands, and expected outputs. Keep response under 200 words.` },
      ];
      const resp = await callAI(LOVABLE_API_KEY, leadMessages);
      return { role: lead.role, sender_name: lead.sender_name, content: resp };
    });

    const leadResults = await Promise.all(leadPromises);
    agentResponses.push(...leadResults);

    // Save all agent messages to DB
    const inserts = agentResponses.map((msg) => ({
      conversation_id: conversationId,
      user_id: user.id,
      role: msg.role,
      sender_name: msg.sender_name,
      content: msg.content,
    }));

    const { data: insertedMsgs } = await supabase.from("messages").insert(inserts).select();

    // Log agent_tasks with quick heuristic grade and bump session counters
    if (sessionId && insertedMsgs) {
      const tasks = insertedMsgs.map((m: any, i: number) => {
        const resp = agentResponses[i];
        const findings = (resp.content.match(/\b(found|detected|discovered|leak|exposed|cve|vuln|critical|high|medium|low)\b/gi) || []).length;
        const len = resp.content.length;
        const score = Math.min(100, 40 + findings * 8 + Math.min(30, Math.floor(len / 40)));
        const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
        return {
          user_id: user.id,
          mission_id: resolvedMissionId,
          session_id: sessionId,
          conversation_id: conversationId,
          message_id: m.id,
          agent_codename: resp.sender_name.toUpperCase().split(" ")[0],
          agent_type: resp.role,
          task_type: "response",
          title: userMessage.slice(0, 80),
          prompt: userMessage,
          result: resp.content,
          findings_count: findings,
          grade,
          grade_score: score,
          grade_reason: `Auto: ${findings} signal terms, ${len} chars`,
        };
      });
      await supabase.from("agent_tasks").insert(tasks);

      const { data: cur } = await supabase.from("sessions").select("tasks_count, findings_count").eq("id", sessionId).single();
      await supabase.from("sessions").update({
        tasks_count: (cur?.tasks_count || 0) + tasks.length,
        findings_count: (cur?.findings_count || 0) + tasks.reduce((s, t) => s + t.findings_count, 0),
      }).eq("id", sessionId);
    }

    return new Response(JSON.stringify({ responses: agentResponses, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mission-chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate limit") ? 429 : msg.includes("Credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: any[]): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: 600,
    }),
  });

  if (resp.status === 429) throw new Error("Rate limit exceeded. Please wait and try again.");
  if (resp.status === 402) throw new Error("Credits exhausted. Add funds in Settings > Workspace > Usage.");
  if (!resp.ok) {
    const body = await resp.text();
    console.error("AI error:", resp.status, body);
    throw new Error(`AI gateway error (${resp.status})`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}
