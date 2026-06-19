import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Brain, AlertTriangle, Sparkles, Wrench, ChevronRight, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIER_MEMBERS: Record<string, { codename: string; tagline: string }[]> = {
  commander: [{ codename: "COMMANDER", tagline: "Strategic orchestrator · memory · grading" }],
  leads: [
    { codename: "PHANTOM", tagline: "Recon Lead — OSINT, DNS, scanning" },
    { codename: "VIPER", tagline: "Exploit Lead — vulns, payloads" },
    { codename: "SPECTER", tagline: "Stealth Lead — evasion, persistence" },
    { codename: "CARTOGRAPHER", tagline: "Attack-surface mapping" },
  ],
  raiders: [
    { codename: "R-001", tagline: "Port Scanner" },
    { codename: "R-002", tagline: "Subdomain Enumerator" },
    { codename: "R-003", tagline: "Fuzzer" },
  ],
};

interface Learning { id: string; agent_codename: string; level: "high" | "medium" | "low"; title: string; body: string | null; created_at: string; }
interface Memory { id: string; agent_codename: string; summary: string; session_id: string | null; created_at: string; }
interface Opinion { id: string; agent_codename: string; topic: string | null; body: string; created_at: string; }
interface Rec { id: string; agent_codename: string; kind: "workflow" | "automation" | "skill"; title: string; body: string | null; status: string; created_at: string; }

export default function AgentsTier() {
  const { tier } = useParams<{ tier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [memory, setMemory] = useState<Memory[]>([]);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);

  const members = TIER_MEMBERS[tier || ""] || [];
  const tierTitle = (tier || "").toUpperCase();

  useEffect(() => {
    if (members.length && !active) setActive(members[0].codename);
  }, [tier]);

  useEffect(() => {
    if (!user || !active) return;
    setLoading(true);
    (async () => {
      const [l, m, o, r] = await Promise.all([
        supabase.from("agent_learnings").select("*").eq("user_id", user.id).eq("agent_codename", active).order("created_at", { ascending: false }),
        supabase.from("agent_memory").select("*").eq("user_id", user.id).eq("agent_codename", active).order("created_at", { ascending: false }),
        supabase.from("agent_opinions").select("*").eq("user_id", user.id).eq("agent_codename", active).order("created_at", { ascending: false }),
        supabase.from("agent_recommendations").select("*").eq("user_id", user.id).eq("agent_codename", active).order("created_at", { ascending: false }),
      ]);
      setLearnings((l.data as Learning[]) || []);
      setMemory((m.data as Memory[]) || []);
      setOpinions((o.data as Opinion[]) || []);
      setRecs((r.data as Rec[]) || []);
      setLoading(false);
    })();
  }, [user, active]);

  const grouped = useMemo(() => ({
    high: learnings.filter((l) => l.level === "high"),
    medium: learnings.filter((l) => l.level === "medium"),
    low: learnings.filter((l) => l.level === "low"),
  }), [learnings]);

  async function promoteRec(rec: Rec) {
    const { error } = await supabase.from("agent_recommendations").update({ status: "promoted" }).eq("id", rec.id);
    if (error) return toast.error(error.message);
    toast.success(`${rec.title} promoted`);
    setRecs((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: "promoted" } : r)));
  }

  async function deleteRow(table: "agent_learnings" | "agent_memory" | "agent_opinions" | "agent_recommendations", id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (table === "agent_learnings") setLearnings((p) => p.filter((x) => x.id !== id));
    if (table === "agent_memory") setMemory((p) => p.filter((x) => x.id !== id));
    if (table === "agent_opinions") setOpinions((p) => p.filter((x) => x.id !== id));
    if (table === "agent_recommendations") setRecs((p) => p.filter((x) => x.id !== id));
  }

  return (
    <AppLayout title={tierTitle} subtitle="Knowledge base · learnings · opinions · recommendations" icon={Users}>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <button onClick={() => navigate("/agents")} className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-3 h-3" /> Back to Agents
        </button>

        {/* Member chips */}
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.codename}
              onClick={() => setActive(m.codename)}
              className={`px-3 py-2 rounded-md border text-xs font-mono transition-all ${
                active === m.codename
                  ? "border-primary/60 bg-primary/15 text-primary neon-gold-box"
                  : "border-border bg-surface-2 text-foreground/70 hover:border-primary/40"
              }`}
            >
              <div className="font-bold">{m.codename}</div>
              <div className="text-[9px] opacity-70">{m.tagline}</div>
            </button>
          ))}
          <button
            onClick={() => navigate(`/agents/${active.toLowerCase()}`)}
            className="ml-auto flex items-center gap-1 px-3 py-2 rounded-md border border-border bg-surface-1 text-xs font-mono text-muted-foreground hover:text-primary hover:border-primary/40"
          >
            Open profile <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading {active}…
          </div>
        ) : (
          <>
            {/* Learnings — 3 columns */}
            <section>
              <h2 className="font-mono text-xs font-bold text-primary tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> LEARNINGS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LearningColumn label="HIGH" tone="high" items={grouped.high} onDelete={(id) => deleteRow("agent_learnings", id)} />
                <LearningColumn label="MEDIUM" tone="medium" items={grouped.medium} onDelete={(id) => deleteRow("agent_learnings", id)} />
                <LearningColumn label="LOW" tone="low" items={grouped.low} onDelete={(id) => deleteRow("agent_learnings", id)} />
              </div>
            </section>

            {/* Memory + Opinions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <section className="rounded-xl border border-border bg-surface-1 p-4">
                <h2 className="font-mono text-xs font-bold text-primary tracking-wider mb-2 flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" /> MEMORY SUMMARIES
                </h2>
                {memory.length === 0 ? (
                  <Empty hint="Generate end-of-session overviews from the Recon tab." />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {memory.map((m) => (
                      <div key={m.id} className="p-2.5 rounded border border-border bg-surface-2 text-xs font-mono">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                          <button onClick={() => deleteRow("agent_memory", m.id)} className="text-[9px] text-destructive/70 hover:text-destructive">Delete</button>
                        </div>
                        <p className="text-foreground/85 whitespace-pre-wrap leading-relaxed">{m.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-surface-1 p-4">
                <h2 className="font-mono text-xs font-bold text-primary tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> AGENT OPINIONS
                </h2>
                {opinions.length === 0 ? (
                  <Empty hint="Specialty-based opinions the agent wants on record." />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {opinions.map((o) => (
                      <div key={o.id} className="p-2.5 rounded border border-border bg-surface-2 text-xs font-mono">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-primary font-bold">{o.topic || "Note"}</span>
                          <button onClick={() => deleteRow("agent_opinions", o.id)} className="text-[9px] text-destructive/70 hover:text-destructive">Delete</button>
                        </div>
                        <p className="text-foreground/85 whitespace-pre-wrap leading-relaxed">{o.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Recommendations */}
            <section className="rounded-xl border border-border bg-surface-1 p-4">
              <h2 className="font-mono text-xs font-bold text-primary tracking-wider mb-2 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" /> RECOMMENDED · workflows / automations / skill.md
              </h2>
              {recs.length === 0 ? (
                <Empty hint="Agent recommendations appear here. Promote skill.md entries to the Skills tab." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recs.map((r) => (
                    <div key={r.id} className="p-3 rounded border border-border bg-surface-2 text-xs font-mono">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          r.kind === "skill" ? "border-primary/60 text-primary bg-primary/10" :
                          r.kind === "automation" ? "border-orange-400/40 text-orange-400" :
                          "border-border text-foreground/70"
                        }`}>{r.kind.toUpperCase()}</span>
                        <span className={`text-[9px] ${r.status === "promoted" ? "text-primary" : "text-muted-foreground"}`}>{r.status}</span>
                      </div>
                      <div className="text-foreground font-bold mb-1">{r.title}</div>
                      {r.body && <p className="text-foreground/75 whitespace-pre-wrap leading-relaxed mb-2">{r.body}</p>}
                      <div className="flex items-center gap-2">
                        {r.status === "pending" && (
                          <button onClick={() => promoteRec(r)} className="text-[10px] px-2 py-0.5 rounded border border-primary/40 text-primary hover:bg-primary/15">
                            Promote
                          </button>
                        )}
                        <button onClick={() => deleteRow("agent_recommendations", r.id)} className="text-[10px] px-2 py-0.5 rounded border border-destructive/30 text-destructive/80 hover:bg-destructive/10">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function LearningColumn({ label, tone, items, onDelete }: {
  label: string;
  tone: "high" | "medium" | "low";
  items: Learning[];
  onDelete: (id: string) => void;
}) {
  const toneCls =
    tone === "high" ? "border-destructive/40 text-destructive" :
    tone === "medium" ? "border-orange-400/40 text-orange-400" :
    "border-primary/30 text-primary/80";
  return (
    <div className={`rounded-xl border bg-surface-1 p-3 ${toneCls.split(" ")[0]}`}>
      <div className={`text-[10px] font-mono font-bold mb-2 ${toneCls.split(" ")[1]}`}>{label} · {items.length}</div>
      {items.length === 0 ? (
        <div className="text-[10px] font-mono text-muted-foreground py-4 text-center">— none —</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((l) => (
            <div key={l.id} className="p-2 rounded border border-border bg-surface-2 text-xs font-mono">
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground font-bold">{l.title}</span>
                <button onClick={() => onDelete(l.id)} className="text-[9px] text-destructive/70 hover:text-destructive ml-2">×</button>
              </div>
              {l.body && <p className="text-foreground/75 whitespace-pre-wrap leading-relaxed">{l.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return <p className="text-xs font-mono text-muted-foreground py-6 text-center">{hint}</p>;
}
