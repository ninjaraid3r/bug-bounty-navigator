import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, ArrowLeft, Trophy, Activity, Zap, Plus, Play, Trash2, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AGENT_META: Record<string, { name: string; type: "manager" | "lead" | "raider"; tagline: string }> = {
  commander: { name: "COMMANDER", type: "manager", tagline: "Strategic mission manager" },
  phantom: { name: "PHANTOM", type: "lead", tagline: "Recon Lead — OSINT, DNS, scanning" },
  viper: { name: "VIPER", type: "lead", tagline: "Exploit Lead — vulns, payloads, attacks" },
  specter: { name: "SPECTER", type: "lead", tagline: "Stealth Lead — evasion, persistence" },
  "r-001": { name: "R-001", type: "raider", tagline: "Port Scanner Raider" },
  "r-002": { name: "R-002", type: "raider", tagline: "Subdomain Enum Raider" },
  "r-003": { name: "R-003", type: "raider", tagline: "Fuzzer Raider" },
};

const gradeColor = (g?: string | null) =>
  g === "A" ? "text-primary" : g === "B" ? "text-foreground" : g === "C" ? "text-muted-foreground" : g === "D" ? "text-orange-400" : "text-destructive";

export default function AgentProfile() {
  const { codename = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = AGENT_META[codename.toLowerCase()] ?? { name: codename.toUpperCase(), type: "raider" as const, tagline: "Raider unit" };

  const [tasks, setTasks] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [newAuto, setNewAuto] = useState({ name: "", description: "", prompt_template: "", category: "" });

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, codename]);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from("agent_tasks").select("*").eq("user_id", user!.id).eq("agent_codename", meta.name).order("created_at", { ascending: false }).limit(100),
      meta.type === "lead"
        ? supabase.from("automations").select("*").eq("user_id", user!.id).eq("agent_codename", meta.name).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setTasks(t || []);
    setAutomations(a || []);
    setLoading(false);
  }

  const stats = {
    total: tasks.length,
    avgScore: tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.grade_score || 0), 0) / tasks.length) : 0,
    findings: tasks.reduce((s, t) => s + (t.findings_count || 0), 0),
    aGrade: tasks.filter(t => t.grade === "A").length,
  };

  async function saveAutomation() {
    if (!newAuto.name || !newAuto.prompt_template) {
      toast.error("Name and prompt template required");
      return;
    }
    const { error } = await supabase.from("automations").insert({
      user_id: user!.id,
      agent_codename: meta.name,
      name: newAuto.name,
      description: newAuto.description,
      prompt_template: newAuto.prompt_template,
      category: newAuto.category || "custom",
      source: "manual",
      status: "approved",
    });
    if (error) return toast.error(error.message);
    toast.success("Automation saved");
    setNewAuto({ name: "", description: "", prompt_template: "", category: "" });
    load();
  }

  async function deleteAutomation(id: string) {
    await supabase.from("automations").delete().eq("id", id);
    load();
  }

  return (
    <AppLayout
      title={meta.name}
      subtitle={meta.tagline}
      icon={User}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      }
    >
      <div className="p-5 space-y-5 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Activity} label="Tasks" value={stats.total} />
          <StatCard icon={Trophy} label="Avg Score" value={stats.avgScore} />
          <StatCard icon={Zap} label="Signals" value={stats.findings} />
          <StatCard icon={Trophy} label="A-Grade" value={stats.aGrade} />
        </div>

        {/* Lead automations */}
        {meta.type === "lead" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Skills & Automations</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> New Skill</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create automation for {meta.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Name (e.g. Full DNS Recon)" value={newAuto.name} onChange={e => setNewAuto({ ...newAuto, name: e.target.value })} />
                    <Input placeholder="Category" value={newAuto.category} onChange={e => setNewAuto({ ...newAuto, category: e.target.value })} />
                    <Input placeholder="Description" value={newAuto.description} onChange={e => setNewAuto({ ...newAuto, description: e.target.value })} />
                    <Textarea rows={5} placeholder="Prompt template — use {target} placeholder" value={newAuto.prompt_template} onChange={e => setNewAuto({ ...newAuto, prompt_template: e.target.value })} />
                    <Button onClick={saveAutomation} className="w-full">Save Skill</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {automations.length === 0 ? (
                <p className="text-xs text-muted-foreground font-mono">No skills saved yet. Save common workflows here for one-click reuse.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {automations.map(a => (
                    <div key={a.id} className="border border-border rounded-md p-3 bg-surface-2/40 hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-semibold text-foreground truncate">{a.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{a.category} · used {a.use_count}×</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge variant={a.source === "ai" ? "default" : "outline"} className="text-[9px]">{a.source}</Badge>
                          <button onClick={() => deleteAutomation(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                      <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded border border-border line-clamp-3 whitespace-pre-wrap">{a.prompt_template}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground font-mono">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No tasks logged yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="border border-border rounded-md p-3 bg-surface-2/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono text-foreground truncate">{t.title}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()} · {t.findings_count} signals</div>
                        {t.result && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.result}</p>}
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

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-surface-2/50 border border-border p-3">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="w-3 h-3" /><span className="text-[10px] font-mono uppercase tracking-widest">{label}</span></div>
      <div className="text-2xl font-mono font-bold text-primary neon-gold mt-1">{value}</div>
    </div>
  );
}
