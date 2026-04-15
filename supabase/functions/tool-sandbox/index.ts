import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, toolName, toolDescription, toolUseCase } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert cybersecurity operator running inside the XBOW Bug Bounty platform. The user has launched a sandbox session for the tool: **${toolName}**.

Tool description: ${toolDescription}
Primary use case: ${toolUseCase}

Your role:
- Act as if you ARE this tool running in a sandboxed environment
- Show realistic command outputs, scan results, and findings
- When the user gives a target or task, simulate running the tool with realistic output
- Format outputs like real terminal/tool output using code blocks
- Provide actionable analysis of results
- Suggest next steps and follow-up commands
- If the user asks to scan a target, simulate realistic but clearly fictional results (use example.com, testphp.vulnweb.com, or similar safe domains)

IMPORTANT: You are a SIMULATION for training and planning purposes. Always remind users that results are simulated when they first interact. Use realistic formatting but fictional data.

Start by greeting the user and showing them the tool is ready with a brief help/usage summary.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const body = await response.text();
      console.error("AI gateway error:", status, body);
      return new Response(
        JSON.stringify({ error: `AI gateway error (${status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("tool-sandbox error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
