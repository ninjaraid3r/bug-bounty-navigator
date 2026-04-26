import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, RefreshCw, Sparkles, Save } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const gradeColor = (g?: string | null) =>
  g === "A" ? "text-primary" : g === "B" ? "text-foreground" : g === "C" ? "text-muted-foreground" : g === "D" ? "text-orange-400" : g === "F" ? "text-destructive" : "text-muted-foreground";

export default function SessionDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (user && id) load(); }, [user, id]);

  async function load() {
    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).single(),
      supabase.from("agent_tasks").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    ]);
    setSession(s);
    setTasks(t || []);
  }

  async function generateReport() {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("session-report", { body: { sessionId: id } });
      if (error) throw error;
      toast.success("Report generated");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setGenerating(false); }
  }

  async function saveAutomation(auto: any) {
    const { error } = await supabase.from("automations").insert({
      user_id: user!.id,
      agent_codename: auto.agent_codename,
      name: auto.name,
      description: auto.description,
      prompt_template: auto.prompt_template,
      category: auto.category || "ai-suggested",
      source: "ai",
      status: "approved",
    });
    if (error) toast.error(error.message);
    else toast.success(`Saved to ${auto.agent_codename}`);
  }

  if (!session) return <AppLayout title="Loading…" icon={FileText}><div className="p-5" /></AppLayout>;

  return (
    <AppLayout
      title={session.title}
      subtitle={`Session report · ${new Date(session.started_at).toLocaleString()}`}
      icon={FileText}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/commander/sessions")}><ArrowLeft className="w-4 h-4 mr-1" /> All Sessions</Button>
          <Button size="sm" onClick={generateReport} disabled={generating}>
            {generating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {session.summary ? "Regenerate Report" : "Generate Report"}
          </Button>
        </div>
      }
    >
      <div className="p-5 max-w-5xl mx-auto space-y-4">
        {/* Header card */}
        <Card>
          <CardContent className="p-5 flex items-center gap-5">
            <div className={`text-6xl font-mono font-bold ${gradeColor(session.grade)} neon-gold`}>{session.grade || "—"}</div>
            <div className="flex-1">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Score: {session.grade_score ?? "—"}/100</div>
              <p className="text-sm text-foreground mt-1">{session.summary || "No summary yet. Generate a report to see the Commander's analysis."}</p>
              {session.grade_notes && <p className="text-[11px] text-muted-foreground mt-1 italic">{session.grade_notes}</p>}
            </div>
            <div className="text-right space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Tasks</div>
              <div className="text-2xl font-mono font-bold text-primary">{session.tasks_count}</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Signals</div>
              <div className="text-2xl font-mono font-bold text-primary">{session.findings_count}</div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons */}
        {session.lessons_learned && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">What We Learned</CardTitle></CardHeader>
            <CardContent><pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{session.lessons_learned}</pre></CardContent>
          </Card>
        )}

        {/* Suggested automations */}
        {Array.isArray(session.automations_suggested) && session.automations_suggested.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Automations to Save</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {session.automations_suggested.map((a: any, i: number) => (
                <div key={i} className="border border-border rounded-md p-3 bg-surface-2/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-foreground">{a.name}</div>
                      <Badge variant="outline" className="text-[9px] mt-1">{a.agent_codename}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveAutomation(a)}><Save className="w-3 h-3 mr-1" /> Save</Button>
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded border border-border whitespace-pre-wrap">{a.prompt_template}</pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Next missions */}
        {Array.isArray(session.next_missions) && session.next_missions.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Suggested Next Missions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {session.next_missions.map((m: any, i: number) => (
                <div key={i} className="border border-border rounded-md p-3 bg-surface-2/40">
                  <div className="font-mono text-sm font-semibold text-foreground">{m.title}</div>
                  {m.rationale && <p className="text-xs text-muted-foreground mt-1">{m.rationale}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step replay */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Step-by-Step Replay</CardTitle></CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No tasks recorded.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <div key={t.id} className="border border-border rounded-md p-3 bg-surface-2/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                          <Badge variant="outline" className="text-[9px]">{t.agent_codename}</Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs font-mono text-foreground mt-1 truncate">{t.title}</div>
                        {t.result && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{t.result}</p>}
                        {t.grade_reason && <p className="text-[10px] text-muted-foreground italic mt-1">{t.grade_reason}</p>}
                      </div>
                      <div className={`text-2xl font-mono font-bold ${gradeColor(t.grade)} shrink-0`}>{t.grade || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
