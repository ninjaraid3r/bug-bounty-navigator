import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User, ArrowLeft, Trophy, Activity, Zap, Plus, Play, Trash2, Loader2,
  Brain, Sparkles, AlertTriangle, Wrench, Search, Hammer, TrendingUp, FileText,
  Eraser, X, BookOpen, Layers, Send, Database, ChevronRight, Map as MapIcon, Check, ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReconMapsPanel from "@/components/ReconMapsPanel";

const AGENT_META: Record<string, { name: string; type: "manager" | "lead" | "raider"; tagline: string; specialty: string }> = {
  commander: { name: "COMMANDER", type: "manager", tagline: "Strategic mission manager", specialty: "Orchestration · Grading · Memory" },
  phantom:   { name: "PHANTOM",   type: "lead",    tagline: "Recon Lead — OSINT, DNS, scanning", specialty: "Discovery · Surface mapping" },
  viper:     { name: "VIPER",     type: "lead",    tagline: "Exploit Lead — vulns, payloads, attacks", specialty: "Exploitation · PoC crafting" },
  specter:   { name: "SPECTER",   type: "lead",    tagline: "Stealth Lead — evasion, persistence", specialty: "Evasion · OPSEC · Persistence" },
  cartographer: { name: "CARTOGRAPHER", type: "lead", tagline: "Recon Mapping Lead — attack surface", specialty: "Subdomains · Endpoints · Mind-mapping" },
  "r-001":   { name: "R-001",     type: "raider",  tagline: "Port Scanner Raider", specialty: "Port enumeration" },
  "r-002":   { name: "R-002",     type: "raider",  tagline: "Subdomain Enum Raider", specialty: "Subdomain discovery" },
  "r-003":   { name: "R-003",     type: "raider",  tagline: "Fuzzer Raider", specialty: "Path / param fuzzing" },
};

const gradeColor = (g?: string | null) =>
  g === "A" ? "text-primary" : g === "B" ? "text-foreground" : g === "C" ? "text-muted-foreground" : g === "D" ? "text-orange-400" : "text-destructive";

// Per-agent metric definitions — each agent shows what they actually do
const AGENT_METRICS: Record<string, { label: string; key: "found" | "fixed" | "created" | "tasks" | "signals" | "agrade" | "avgScore" }[]> = {
  COMMANDER: [
    { label: "Sessions Run",     key: "tasks" },
    { label: "Avg Grade Score",  key: "avgScore" },
    { label: "Critical Changes", key: "fixed" },
    { label: "Skills Created",   key: "created" },
  ],
  PHANTOM: [
    { label: "Recon Tasks",      key: "tasks" },
    { label: "Assets Found",     key: "found" },
    { label: "Signals",          key: "signals" },
    { label: "A-Grade Runs",     key: "agrade" },
  ],
  VIPER: [
    { label: "Exploit Tasks",    key: "tasks" },
    { label: "Vulns Found",      key: "found" },
    { label: "PoCs Created",     key: "created" },
    { label: "Avg Score",        key: "avgScore" },
  ],
  SPECTER: [
    { label: "Evasion Tasks",    key: "tasks" },
    { label: "Detections Fixed", key: "fixed" },
    { label: "Payloads Created", key: "created" },
    { label: "A-Grade Runs",     key: "agrade" },
  ],
  CARTOGRAPHER: [
    { label: "Mapping Tasks",    key: "tasks" },
    { label: "Assets Mapped",    key: "found" },
    { label: "Signals",          key: "signals" },
    { label: "A-Grade Runs",     key: "agrade" },
  ],
};

export default function AgentProfile() {
  const { codename = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = AGENT_META[codename.toLowerCase()] ?? { name: codename.toUpperCase(), type: "raider" as const, tagline: "Raider unit", specialty: "—" };

  const [tasks, setTasks] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [newAuto, setNewAuto] = useState({ name: "", description: "", prompt_template: "", category: "" });
  const [selSessions, setSelSessions] = useState<Set<string>>(new Set());
  const [selTasks, setSelTasks] = useState<Set<string>>(new Set());
  const [selSkills, setSelSkills] = useState<Set<string>>(new Set());
  const [grading, setGrading] = useState(false);

  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n; };

  async function bulkDelete(table: "sessions" | "agent_tasks" | "automations", ids: string[], clear: () => void) {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} item${ids.length === 1 ? "" : "s"} permanently?`)) return;
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length}`);
    clear();
    load();
  }

  async function gradeSelectedSkills() {
    const ids = Array.from(selSkills);
    if (!ids.length) return toast.error("Select skills to grade");
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("commander-grade-skill", { body: { automationIds: ids } });
      if (error) throw error;
      toast.success(`Commander graded ${data?.graded?.length ?? 0} skill(s)`);
      setSelSkills(new Set());
      load();
    } catch (e: any) { toast.error(e?.message || "Grading failed"); }
    finally { setGrading(false); }
  }

  useEffect(() => { if (user) load(); }, [user, codename]);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: a }, { data: s }] = await Promise.all([
      supabase.from("agent_tasks").select("*").eq("user_id", user!.id).eq("agent_codename", meta.name).order("created_at", { ascending: false }).limit(200),
      meta.type !== "raider"
        ? supabase.from("automations").select("*").eq("user_id", user!.id).eq("agent_codename", meta.name).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("sessions").select("*").eq("user_id", user!.id).order("started_at", { ascending: false }).limit(50),
    ]);
    setTasks(t || []);
    setAutomations(a || []);
    setSessions(s || []);
    setLoading(false);
  }

  const stats = useMemo(() => ({
    tasks: tasks.length,
    avgScore: tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.grade_score || 0), 0) / tasks.length) : 0,
    signals: tasks.reduce((s, t) => s + (t.findings_count || 0), 0),
    agrade: tasks.filter(t => t.grade === "A").length,
    found:   tasks.reduce((s, t) => s + (t.found_count || 0), 0),
    fixed:   tasks.reduce((s, t) => s + (t.fixed_count || 0), 0),
    created: tasks.reduce((s, t) => s + (t.created_count || 0), 0),
  }), [tasks]);

  const metricCards = AGENT_METRICS[meta.name] ?? [
    { label: "Tasks", key: "tasks" as const },
    { label: "Avg Score", key: "avgScore" as const },
    { label: "Signals", key: "signals" as const },
    { label: "A-Grade", key: "agrade" as const },
  ];

  // Found / Fixed / Created lists pulled from tasks + session agent_insights
  const accomplishments = useMemo(() => {
    const found: { text: string; src: string }[] = [];
    const fixed: { text: string; src: string }[] = [];
    const created: { text: string; src: string }[] = [];
    for (const t of tasks) {
      if (t.specialty_notes) found.push({ text: t.specialty_notes, src: new Date(t.created_at).toLocaleDateString() });
    }
    for (const s of sessions) {
      const ins = s.agent_insights?.[meta.name];
      if (!ins) continue;
      const tag = s.title || new Date(s.started_at).toLocaleDateString();
      (ins.found || []).forEach((x: string) => found.push({ text: x, src: tag }));
      (ins.fixed || []).forEach((x: string) => fixed.push({ text: x, src: tag }));
      (ins.created || []).forEach((x: string) => created.push({ text: x, src: tag }));
    }
    return { found, fixed, created };
  }, [tasks, sessions, meta.name]);

  const improvements = useMemo(() => {
    const out: { text: string; session: string }[] = [];
    for (const s of sessions) {
      const ins = s.agent_insights?.[meta.name];
      (ins?.improvements || []).forEach((x: string) => out.push({ text: x, session: s.title || new Date(s.started_at).toLocaleDateString() }));
    }
    return out;
  }, [sessions, meta.name]);

  async function generateSessionMemory(sessionId: string) {
    setGeneratingId(sessionId);
    try {
      const { error } = await supabase.functions.invoke("session-report", { body: { sessionId } });
      if (error) throw error;
      toast.success("Session memory generated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setGeneratingId(null);
    }
  }

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [phaseRunningId, setPhaseRunningId] = useState<string | null>(null);
  const [handoffKey, setHandoffKey] = useState<string | null>(null);

  async function leadReviewSession(sessionId: string) {
    setReviewingId(sessionId);
    try {
      const { data, error } = await supabase.functions.invoke("lead-review", {
        body: { sessionId, agentCodename: meta.name },
      });
      if (error) throw error;
      const n = data?.automations?.length || 0;
      toast.success(`${meta.name} review complete · ${n} new skill${n === 1 ? "" : "s"}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Review failed");
    } finally {
      setReviewingId(null);
    }
  }

  async function reviewLatestSession() {
    const latest = sessions[0];
    if (!latest) return toast.error("No sessions yet — run a mission first.");
    await leadReviewSession(latest.id);
  }

  async function commanderPhasedReview(sessionId: string) {
    setPhaseRunningId(sessionId);
    try {
      const { error } = await supabase.functions.invoke("commander-review", { body: { sessionId } });
      if (error) throw error;
      toast.success("Phased review complete");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Phased review failed");
    } finally {
      setPhaseRunningId(null);
    }
  }

  async function passToLead(sessionId: string, targetLead: string, item: any, key: string) {
    setHandoffKey(key);
    try {
      const { data, error } = await supabase.functions.invoke("pass-to-lead", {
        body: { sessionId, targetLead, item },
      });
      if (error) throw error;
      toast.success(`Handed off to ${targetLead}${data?.skill ? " · skill saved" : ""}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Handoff failed");
    } finally {
      setHandoffKey(null);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session memory permanently?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Session deleted");
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task entry?")) return;
    const { error } = await supabase.from("agent_tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    load();
  }

  async function clearSessionField(id: string, patch: Record<string, any>) {
    if (!confirm("Clear this memory section?")) return;
    const { error } = await supabase.from("sessions").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cleared");
    load();
  }

  async function removeAgentInsights(s: any) {
    const next = { ...(s.agent_insights || {}) };
    delete next[meta.name];
    await clearSessionField(s.id, { agent_insights: next });
  }


  async function saveAutomation() {
    if (!newAuto.name || !newAuto.prompt_template) return toast.error("Name and prompt template required");
    const { error } = await supabase.from("automations").insert({
      user_id: user!.id, agent_codename: meta.name,
      name: newAuto.name, description: newAuto.description, prompt_template: newAuto.prompt_template,
      category: newAuto.category || "custom", source: "manual", status: "approved",
    });
    if (error) return toast.error(error.message);
    toast.success("Skill saved");
    setNewAuto({ name: "", description: "", prompt_template: "", category: "" });
    load();
  }

  async function deleteAutomation(id: string) { await supabase.from("automations").delete().eq("id", id); load(); }

  async function approveAutomation(a: any, edits?: { name?: string; prompt_template?: string; description?: string }) {
    const patch: any = { status: "approved" };
    if (edits?.name) patch.name = edits.name;
    if (edits?.prompt_template) patch.prompt_template = edits.prompt_template;
    if (edits?.description !== undefined) patch.description = edits.description;
    const { error } = await supabase.from("automations").update(patch).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Skill approved");
    load();
  }
  async function rejectAutomation(id: string) {
    if (!confirm("Reject this proposed skill? It will be deleted.")) return;
    await supabase.from("automations").delete().eq("id", id);
    toast.success("Rejected");
    load();
  }

  async function runSkill(automation: any) {
    if (!user) return;
    setRunningId(automation.id);
    try {
      const { data: missions } = await supabase.from("missions").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1);
      const mission = missions?.[0];
      if (!mission) { toast.error("No active mission. Open Recon to start one."); return; }
      const target = mission.target?.trim();
      if (!target || target === "target.com") { toast.error("Set a valid mission target first."); return; }

      const { data: convos } = await supabase.from("conversations").select("*").eq("mission_id", mission.id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      const conversation = convos?.[0];
      if (!conversation) { toast.error("No conversation found for this mission."); return; }

      const prompt = automation.prompt_template.replaceAll("{target}", target);
      const userMessage = `[Skill: ${automation.name}] ${prompt}`;
      await supabase.from("messages").insert({ conversation_id: conversation.id, user_id: user.id, role: "user", sender_name: "You", content: userMessage });

      const { data: history } = await supabase.from("messages").select("role, sender_name, content").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(20);
      const { error } = await supabase.functions.invoke("mission-chat", {
        body: { conversationId: conversation.id, missionId: mission.id, userMessage, history: (history || []).reverse() },
      });
      if (error) throw error;
      await supabase.from("automations").update({ use_count: (automation.use_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", automation.id);
      toast.success(`${automation.name} dispatched`);
      navigate("/");
    } catch (e: any) {
      toast.error(e?.message || "Failed to run skill");
    } finally {
      setRunningId(null);
    }
  }

  const isCommander = meta.name === "COMMANDER";

  return (
    <AppLayout
      title={meta.name}
      subtitle={`${meta.tagline} · ${meta.specialty}`}
      icon={User}
      actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
    >
      <div className="p-5 space-y-5 max-w-6xl mx-auto">
        {/* Per-agent metric strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricCards.map(m => (
            <StatCard key={m.label} label={m.label} value={(stats as any)[m.key] ?? 0} />
          ))}
        </div>

        <Tabs defaultValue="memory" className="w-full">
          <TabsList className="bg-surface-2/40 border border-border">
            <TabsTrigger value="memory"><Brain className="w-3 h-3 mr-1" /> Memory</TabsTrigger>
            <TabsTrigger value="accomplished"><Trophy className="w-3 h-3 mr-1" /> Found / Fixed / Created</TabsTrigger>
            <TabsTrigger value="improve"><TrendingUp className="w-3 h-3 mr-1" /> Make Us Better</TabsTrigger>
            {meta.type !== "raider" && <TabsTrigger value="skills"><Zap className="w-3 h-3 mr-1" /> Skills</TabsTrigger>}
            <TabsTrigger value="activity"><Activity className="w-3 h-3 mr-1" /> Activity</TabsTrigger>
          </TabsList>

          {/* MEMORY — every session this agent participated in */}
          <TabsContent value="memory" className="mt-4 space-y-3">
            {meta.name === "CARTOGRAPHER" && <ReconMapsPanel />}
            <div className="flex flex-wrap items-center gap-2">
              {meta.type !== "raider" && (
                <Button size="sm" variant="default" onClick={reviewLatestSession} disabled={!sessions.length || !!reviewingId}>
                  {reviewingId ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Reviewing latest…</> : <><BookOpen className="w-3 h-3 mr-1" /> Review Latest Session</>}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => navigate("/commander/sessions")}>
                <Database className="w-3 h-3 mr-1" /> All Past Sessions
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/skills/pending")}>
                <ShieldCheck className="w-3 h-3 mr-1" /> Skill Approval Queue
              </Button>
              <span className="text-[10px] font-mono text-muted-foreground">{sessions.length} session{sessions.length === 1 ? "" : "s"} on record</span>
              {selSessions.size > 0 && (
                <Button size="sm" variant="destructive" className="ml-auto h-7 text-[11px]"
                  onClick={() => bulkDelete("sessions", Array.from(selSessions), () => setSelSessions(new Set()))}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete {selSessions.size} selected
                </Button>
              )}
            </div>
            {sessions.length === 0 ? (
              <Card><CardContent className="p-6 text-xs font-mono text-muted-foreground">No sessions logged yet.</CardContent></Card>
            ) : sessions.map(s => {
              const ins = s.agent_insights?.[meta.name];
              const hasMemory = !!s.summary || !!s.key_topic;
              return (
                <Collapsible key={s.id}>
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Checkbox
                          checked={selSessions.has(s.id)}
                          onCheckedChange={() => setSelSessions(toggle(selSessions, s.id))}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <CollapsibleTrigger className="flex-1 text-left flex items-center gap-3 hover:text-primary transition-colors">
                          <div className={`text-2xl font-mono font-bold ${gradeColor(s.grade)} shrink-0`}>{s.grade || "—"}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-mono font-semibold text-foreground truncate">{s.title}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {new Date(s.started_at).toLocaleString()} · {s.tasks_count} tasks · {s.findings_count} signals
                              {s.key_topic && <> · <span className="text-primary">{s.key_topic}</span></>}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => generateSessionMemory(s.id)} disabled={generatingId === s.id} className="h-7 text-[11px]">
                            {generatingId === s.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3 mr-1" /> {hasMemory ? "Regenerate" : "Generate Memory"}</>}
                          </Button>
                          {meta.type !== "raider" && (
                            <Button size="sm" variant="outline" onClick={() => leadReviewSession(s.id)} disabled={reviewingId === s.id} className="h-7 text-[11px]" title={`${meta.name} reviews this session and creates new automations`}>
                              {reviewingId === s.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Reviewing…</> : <><BookOpen className="w-3 h-3 mr-1" /> Lead Review</>}
                            </Button>
                          )}
                          {isCommander && (
                            <Button size="sm" variant="outline" onClick={() => commanderPhasedReview(s.id)} disabled={phaseRunningId === s.id} className="h-7 text-[11px]" title="Run 4-phase strategic review">
                              {phaseRunningId === s.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Phasing…</> : <><Layers className="w-3 h-3 mr-1" /> Phased Review</>}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/commander/sessions/${s.id}`)} className="h-7 text-[11px]"><FileText className="w-3 h-3 mr-1" /> Full</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSession(s.id)} className="h-7 text-[11px] text-muted-foreground hover:text-destructive" title="Delete session memory"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {s.summary && <p className="text-xs text-foreground">{s.summary}</p>}

                        <div className="flex flex-wrap gap-1.5">
                          {(s.high_learnings?.length || s.medium_learnings?.length || s.low_learnings?.length) ? (
                            <ClearChip onClick={() => clearSessionField(s.id, { high_learnings: [], medium_learnings: [], low_learnings: [] })}>Clear Learnings</ClearChip>
                          ) : null}
                          {s.critical_changes?.length ? (
                            <ClearChip onClick={() => clearSessionField(s.id, { critical_changes: [] })}>Clear Critical</ClearChip>
                          ) : null}
                          {ins ? <ClearChip onClick={() => removeAgentInsights(s)}>Clear {meta.name} Insights</ClearChip> : null}
                          {isCommander && s.team_improvements?.length ? (
                            <ClearChip onClick={() => clearSessionField(s.id, { team_improvements: [] })}>Clear Team Improvements</ClearChip>
                          ) : null}
                          {s.summary ? <ClearChip onClick={() => clearSessionField(s.id, { summary: null, lessons_learned: null })}>Clear Summary</ClearChip> : null}
                        </div>

                        {Array.isArray(s.critical_changes) && s.critical_changes.length > 0 && (
                          <Section icon={AlertTriangle} label="Critical Changes" tone="destructive">
                            {s.critical_changes.map((c: any, i: number) => (
                              <div key={i} className="border-l-2 border-destructive pl-2 py-1 group/item flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-foreground">{c.title}</div>
                                  {c.old_behavior && <div className="text-[10px] text-muted-foreground">Was: {c.old_behavior}</div>}
                                  <div className="text-[11px] text-primary">Now: {c.new_behavior}</div>
                                  {c.reason && <div className="text-[10px] text-muted-foreground italic">{c.reason}</div>}
                                </div>
                                <button onClick={() => clearSessionField(s.id, { critical_changes: s.critical_changes.filter((_: any, j: number) => j !== i) })} className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </Section>
                        )}

                        <div className="grid md:grid-cols-3 gap-2">
                          <LearnList label="High" tone="primary" items={s.high_learnings} onRemove={(i) => clearSessionField(s.id, { high_learnings: (s.high_learnings || []).filter((_: any, j: number) => j !== i) })} />
                          <LearnList label="Medium" tone="foreground" items={s.medium_learnings} onRemove={(i) => clearSessionField(s.id, { medium_learnings: (s.medium_learnings || []).filter((_: any, j: number) => j !== i) })} />
                          <LearnList label="Low" tone="muted" items={s.low_learnings} onRemove={(i) => clearSessionField(s.id, { low_learnings: (s.low_learnings || []).filter((_: any, j: number) => j !== i) })} />
                        </div>

                        {ins && (
                          <Section icon={User} label={`${meta.name} Insights`}>
                            <div className="grid md:grid-cols-3 gap-2">
                              <MiniList icon={Search} title="Found" items={ins.found} />
                              <MiniList icon={Wrench} title="Fixed" items={ins.fixed} />
                              <MiniList icon={Hammer} title="Created" items={ins.created} />
                            </div>
                            {ins.improvements?.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Improvements</div>
                                <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">{ins.improvements.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                              </div>
                            )}
                          </Section>
                        )}

                        {isCommander && Array.isArray(s.team_improvements) && s.team_improvements.length > 0 && (
                          <Section icon={TrendingUp} label="Team Improvements">
                            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">{s.team_improvements.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                          </Section>
                        )}

                        {isCommander && s.agent_insights?.COMMANDER_REVIEW && (
                          <Section icon={Layers} label={`Phased Review · ${new Date(s.agent_insights.COMMANDER_REVIEW.reviewed_at).toLocaleString()}`}>
                            {s.agent_insights.COMMANDER_REVIEW.executive_summary && (
                              <p className="text-xs text-foreground mb-2">{s.agent_insights.COMMANDER_REVIEW.executive_summary}</p>
                            )}
                            <div className="space-y-2">
                              {(s.agent_insights.COMMANDER_REVIEW.phases || []).map((p: any, pi: number) => (
                                <div key={pi} className="border border-border rounded-md p-2 bg-background/40">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary">{p.title}</span>
                                    <Badge variant="outline" className="text-[9px]">{p.default_lead}</Badge>
                                  </div>
                                  {p.focus && <div className="text-[10px] text-muted-foreground italic mb-1">{p.focus}</div>}
                                  {Array.isArray(p.areas_of_interest) && p.areas_of_interest.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                      {p.areas_of_interest.map((a: string, ai: number) => (
                                        <span key={ai} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2/60 border border-border text-muted-foreground">{a}</span>
                                      ))}
                                    </div>
                                  )}
                                  <ul className="space-y-1.5">
                                    {(p.items || []).map((it: any, ii: number) => {
                                      const key = `${s.id}-${pi}-${ii}`;
                                      return (
                                        <li key={ii} className="border-l-2 border-primary/40 pl-2">
                                          <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="text-[11px] text-foreground">{it.text}</div>
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <Badge variant="outline" className="text-[9px]">{it.target_lead}</Badge>
                                                {it.severity && <span className={`text-[9px] font-mono uppercase ${it.severity === "high" ? "text-destructive" : it.severity === "medium" ? "text-primary" : "text-muted-foreground"}`}>{it.severity}</span>}
                                                {it.suggested_skill?.name && <span className="text-[9px] font-mono text-muted-foreground truncate">⚡ {it.suggested_skill.name}</span>}
                                              </div>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-6 text-[10px] shrink-0" disabled={handoffKey === key}
                                              onClick={() => passToLead(s.id, it.target_lead, it, key)}>
                                              {handoffKey === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3 mr-1" /> Pass to {it.target_lead}</>}
                                            </Button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </Section>
                        )}

                        {!isCommander && Array.isArray(s.agent_insights?.[meta.name]?.handoffs) && s.agent_insights[meta.name].handoffs.length > 0 && (
                          <Section icon={Send} label="Commander Handoffs to You">
                            <ul className="text-[11px] text-foreground space-y-1">
                              {s.agent_insights[meta.name].handoffs.map((h: any, i: number) => (
                                <li key={i} className="border-l-2 border-primary pl-2">
                                  {h.text}
                                  <div className="text-[9px] font-mono text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
                                </li>
                              ))}
                            </ul>
                          </Section>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </TabsContent>

          {/* FOUND / FIXED / CREATED */}
          <TabsContent value="accomplished" className="mt-4">
            <div className="grid md:grid-cols-3 gap-3">
              <AccomplishCard icon={Search} title="Found" items={accomplishments.found} />
              <AccomplishCard icon={Wrench} title="Fixed" items={accomplishments.fixed} />
              <AccomplishCard icon={Hammer} title="Created" items={accomplishments.created} />
            </div>
          </TabsContent>

          {/* IMPROVE */}
          <TabsContent value="improve" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Concrete Improvements for {meta.name}</CardTitle></CardHeader>
              <CardContent>
                {improvements.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-mono">Run "Generate Memory" on sessions to extract improvement opportunities.</p>
                ) : (
                  <div className="space-y-2">
                    {improvements.map((imp, i) => (
                      <div key={i} className="border border-border rounded-md p-3 bg-surface-2/40">
                        <p className="text-xs text-foreground">{imp.text}</p>
                        <div className="text-[10px] font-mono text-muted-foreground mt-1">From: {imp.session}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SKILLS */}
          {meta.type !== "raider" && (
            <TabsContent value="skills" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary">Skills & Automations</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> New Skill</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create automation for {meta.name}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Input placeholder="Name" value={newAuto.name} onChange={e => setNewAuto({ ...newAuto, name: e.target.value })} />
                        <Input placeholder="Category" value={newAuto.category} onChange={e => setNewAuto({ ...newAuto, category: e.target.value })} />
                        <Input placeholder="Description" value={newAuto.description} onChange={e => setNewAuto({ ...newAuto, description: e.target.value })} />
                        <Textarea rows={5} placeholder="Prompt template — use {target} placeholder" value={newAuto.prompt_template} onChange={e => setNewAuto({ ...newAuto, prompt_template: e.target.value })} />
                        <Button onClick={saveAutomation} className="w-full">Save Skill</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selSkills.size > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded border border-primary/40 bg-primary/5">
                      <span className="text-[11px] font-mono text-primary flex-1">{selSkills.size} selected</span>
                      <Button size="sm" variant="default" className="h-7 text-[11px]" disabled={grading} onClick={gradeSelectedSkills}>
                        {grading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Commander grading…</> : <><ShieldCheck className="w-3 h-3 mr-1" /> Send to Commander</>}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[11px]"
                        onClick={() => bulkDelete("automations", Array.from(selSkills), () => setSelSkills(new Set()))}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                  {/* Pending approval queue */}
                  {(() => {
                    const pending = automations.filter(a => a.status === "pending" || a.status === "commander_reviewed");
                    const approved = automations.filter(a => a.status === "approved");
                    return (
                      <>
                        {pending.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
                                Pending Approval ({pending.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {pending.map(a => (
                                <PendingSkillCard
                                  key={a.id}
                                  automation={a}
                                  selected={selSkills.has(a.id)}
                                  onToggleSelect={() => setSelSkills(toggle(selSkills, a.id))}
                                  onApprove={(edits) => approveAutomation(a, edits)}
                                  onReject={() => rejectAutomation(a.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                            Approved Skills ({approved.length})
                          </span>
                          {approved.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-mono">No skills saved yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {approved.map(a => (
                                <div key={a.id} className="border border-border rounded-md p-3 bg-surface-2/40 hover:border-primary/40 transition-colors">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <Checkbox checked={selSkills.has(a.id)} onCheckedChange={() => setSelSkills(toggle(selSkills, a.id))} className="mt-0.5" />
                                      <div className="min-w-0">
                                        <div className="font-mono text-sm font-semibold text-foreground truncate">{a.name}</div>
                                        <div className="text-[10px] font-mono text-muted-foreground">{a.category} · used {a.use_count}×</div>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Badge variant={a.source === "ai" ? "default" : "outline"} className="text-[9px]">{a.source}</Badge>
                                      <button onClick={() => deleteAutomation(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                  {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                                  <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-background/50 p-2 rounded border border-border line-clamp-3 whitespace-pre-wrap">{a.prompt_template}</pre>
                                  <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-[11px] font-mono" disabled={runningId === a.id} onClick={() => runSkill(a)}>
                                    {runningId === a.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Dispatching…</> : <><Play className="w-3 h-3 mr-1" /> Run Skill</>}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ACTIVITY */}
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-xs text-muted-foreground font-mono">Loading…</p>
                  : tasks.length === 0 ? <p className="text-xs text-muted-foreground font-mono">No tasks logged yet.</p>
                  : (
                    <div className="space-y-2">
                      {tasks.map(t => (
                        <div key={t.id} className="border border-border rounded-md p-3 bg-surface-2/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-mono text-foreground truncate">{t.title}</div>
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()} · {t.findings_count} signals</div>
                              {t.result && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.result}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`text-2xl font-mono font-bold ${gradeColor(t.grade)}`}>{t.grade || "—"}</div>
                              <button onClick={() => deleteTask(t.id)} className="text-muted-foreground hover:text-destructive" title="Delete task"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-surface-2/50 border border-border p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-mono font-bold text-primary neon-gold mt-1">{value}</div>
    </div>
  );
}

function Section({ icon: Icon, label, tone, children }: { icon: any; label: string; tone?: "destructive" | "primary"; children: React.ReactNode }) {
  const color = tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="border border-border rounded-md p-3 bg-background/40">
      <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
        <Icon className="w-3 h-3" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  );
}

function LearnList({ label, tone, items, onRemove }: { label: string; tone: "primary" | "foreground" | "muted"; items?: string[]; onRemove?: (i: number) => void }) {
  const color = tone === "primary" ? "text-primary" : tone === "foreground" ? "text-foreground" : "text-muted-foreground";
  return (
    <div className="border border-border rounded-md p-2 bg-background/40">
      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${color} mb-1`}>{label} Learnings</div>
      {Array.isArray(items) && items.length > 0
        ? <ul className="text-[11px] text-muted-foreground space-y-0.5">
            {items.map((x, i) => (
              <li key={i} className="flex items-start gap-1 group/li">
                <span className="text-primary">•</span>
                <span className="flex-1">{x}</span>
                {onRemove && <button onClick={() => onRemove(i)} className="opacity-0 group-hover/li:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><X className="w-3 h-3" /></button>}
              </li>
            ))}
          </ul>
        : <p className="text-[10px] text-muted-foreground italic">None.</p>}
    </div>
  );
}

function ClearChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-surface-2/40 hover:border-destructive hover:text-destructive text-[10px] font-mono text-muted-foreground transition-colors">
      <Eraser className="w-2.5 h-2.5" /> {children}
    </button>
  );
}

function MiniList({ icon: Icon, title, items }: { icon: any; title: string; items?: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-primary mb-1"><Icon className="w-3 h-3" /> {title}</div>
      {Array.isArray(items) && items.length > 0
        ? <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
        : <p className="text-[10px] text-muted-foreground italic">—</p>}
    </div>
  );
}

function AccomplishCard({ icon: Icon, title, items }: { icon: any; title: string; items: { text: string; src: string }[] }) {
  return (
    <Card>
      <CardHeader className="py-3"><CardTitle className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-1.5"><Icon className="w-3 h-3" /> {title} <span className="text-muted-foreground">({items.length})</span></CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-[11px] text-muted-foreground font-mono italic">Nothing yet.</p>
          : <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {items.map((it, i) => (
                <div key={i} className="text-[11px] text-foreground border-l-2 border-primary/40 pl-2">
                  {it.text}
                  <div className="text-[9px] font-mono text-muted-foreground">{it.src}</div>
                </div>
              ))}
            </div>}
      </CardContent>
    </Card>
  );
}

function PendingSkillCard({ automation, onApprove, onReject }: {
  automation: any;
  onApprove: (edits?: { name?: string; prompt_template?: string; description?: string }) => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(automation.name || "");
  const [desc, setDesc] = useState(automation.description || "");
  const [tpl, setTpl] = useState(automation.prompt_template || "");
  return (
    <div className="border border-primary/40 rounded-md p-3 bg-primary/5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input className="h-7 text-xs font-mono mb-1" value={name} onChange={(e) => setName(e.target.value)} />
          ) : (
            <div className="font-mono text-sm font-semibold text-foreground truncate">{automation.name}</div>
          )}
          <div className="text-[10px] font-mono text-muted-foreground">{automation.category} · proposed by {automation.source}</div>
        </div>
        <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40">PENDING</Badge>
      </div>
      {editing ? (
        <>
          <Input className="h-7 text-xs font-mono mb-2" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Textarea rows={5} className="text-[10px] font-mono mb-2" value={tpl} onChange={(e) => setTpl(e.target.value)} />
        </>
      ) : (
        <>
          {automation.description && <p className="text-xs text-muted-foreground mb-1.5">{automation.description}</p>}
          <pre className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded border border-border line-clamp-4 whitespace-pre-wrap">{automation.prompt_template}</pre>
        </>
      )}
      <div className="flex gap-1 mt-2">
        <Button size="sm" variant="default" className="h-7 text-[11px] flex-1"
          onClick={() => onApprove(editing ? { name, prompt_template: tpl, description: desc } : undefined)}>
          <Check className="w-3 h-3 mr-1" /> {editing ? "Save & Approve" : "Approve"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditing(v => !v)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-destructive" onClick={onReject}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
