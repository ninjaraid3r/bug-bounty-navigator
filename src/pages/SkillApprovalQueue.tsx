import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Loader2, Check, X, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function SkillApprovalQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [grading, setGrading] = useState(false);

  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "commander_reviewed"])
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function approve(a: any) {
    const patch: any = { status: "approved" };
    if (editId === a.id) {
      patch.name = draft.name ?? a.name;
      patch.description = draft.description ?? a.description;
      patch.prompt_template = draft.prompt_template ?? a.prompt_template;
    }
    const { error } = await supabase.from("automations").update(patch).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(`Approved → ${a.agent_codename}`);
    setEditId(null);
    load();
  }
  async function reject(id: string) {
    if (!confirm("Reject and delete this proposed skill?")) return;
    await supabase.from("automations").delete().eq("id", id);
    toast.success("Rejected");
    load();
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} skill(s)?`)) return;
    const { error } = await supabase.from("automations").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length}`);
    setSelected(new Set());
    load();
  }

  async function gradeSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return toast.error("Select skills to grade");
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("commander-grade-skill", { body: { automationIds: ids } });
      if (error) throw error;
      toast.success(`Commander graded ${data?.graded?.length ?? 0} skill(s)`);
      setSelected(new Set());
      load();
    } catch (e: any) { toast.error(e?.message || "Grading failed"); }
    finally { setGrading(false); }
  }

  const grouped: Record<string, any[]> = items.reduce((acc, a) => {
    (acc[a.agent_codename] ||= []).push(a);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <AppLayout
      title="SKILL APPROVAL QUEUE"
      subtitle={`${items.length} skill${items.length === 1 ? "" : "s"} awaiting your review`}
      icon={ShieldCheck}
      actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
    >
      <div className="p-5 space-y-5 max-w-5xl mx-auto">
        {selected.size > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-2 p-2 rounded border border-primary/40 bg-primary/10 backdrop-blur">
            <span className="text-[11px] font-mono text-primary flex-1">{selected.size} selected</span>
            <Button size="sm" variant="default" className="h-7 text-[11px]" disabled={grading} onClick={gradeSelected}>
              {grading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Commander grading…</> : <><ShieldCheck className="w-3 h-3 mr-1" /> Send to Commander</>}
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={bulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
        {loading ? (
          <div className="py-20 grid place-items-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-xs font-mono text-muted-foreground">
            No skills pending approval. AI-extracted automations will land here for review before joining a lead's memory.
          </CardContent></Card>
        ) : Object.entries(grouped).map(([codename, list]) => (
          <Card key={codename}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="font-mono text-[10px]">{codename}</Badge>
                  <span className="text-[11px] font-mono text-muted-foreground">{list.length} pending</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/agents/${codename.toLowerCase()}`)}>
                  Open profile
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {list.map(a => {
                  const isEditing = editId === a.id;
                  const grade = a.metadata?.commander_grade;
                  const graded = a.status === "commander_reviewed" && grade;
                  return (
                    <div key={a.id} className={`border rounded-md p-3 ${graded ? "border-primary bg-primary/10" : "border-primary/40 bg-primary/5"}`}>
                      <div className="flex items-start gap-2 mb-1.5">
                        <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <Input className="h-7 text-xs font-mono mb-1" value={draft.name ?? a.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                          ) : (
                            <div className="font-mono text-sm font-semibold text-foreground truncate">{a.name}</div>
                          )}
                          <div className="text-[10px] font-mono text-muted-foreground">{a.category} · {a.source}</div>
                        </div>
                        <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40 shrink-0">{graded ? "GRADED" : "AWAITING"}</Badge>
                      </div>
                      {isEditing ? (
                        <>
                          <Input className="h-7 text-xs font-mono mb-2" value={draft.description ?? a.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                          <Textarea rows={5} className="text-[10px] font-mono mb-2" value={draft.prompt_template ?? a.prompt_template} onChange={(e) => setDraft({ ...draft, prompt_template: e.target.value })} />
                        </>
                      ) : (
                        <>
                          {a.description && <p className="text-xs text-muted-foreground mb-1.5">{a.description}</p>}
                          <pre className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded border border-border line-clamp-4 whitespace-pre-wrap">{a.prompt_template}</pre>
                        </>
                      )}
                      {graded && (
                        <div className="mt-2 border border-primary/40 rounded-md bg-background/40 p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Commander Grade</span>
                            <span className="text-[10px] font-mono text-primary">{grade.total}/15 · {grade.verdict?.replace("recommend_", "")}</span>
                          </div>
                          {(["implementable_today", "team_relevant", "scaling_potential"] as const).map((k) => (
                            <div key={k}>
                              <span className={`text-[10px] font-mono font-bold w-6 inline-block ${grade[k].score >= 4 ? "text-primary" : grade[k].score >= 3 ? "text-foreground" : "text-orange-400"}`}>{grade[k].score}/5</span>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-1">{k.replace(/_/g, " ")}</span>
                              {grade[k].note && <p className="text-[10px] text-muted-foreground pl-8">{grade[k].note}</p>}
                            </div>
                          ))}
                          {Array.isArray(grade.scaling_potential.scaling_ideas) && grade.scaling_potential.scaling_ideas.length > 0 && (
                            <ul className="text-[10px] text-muted-foreground list-disc pl-6">
                              {grade.scaling_potential.scaling_ideas.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          )}
                          {grade.verdict_reason && <p className="text-[10px] text-foreground italic mt-1">"{grade.verdict_reason}"</p>}
                        </div>
                      )}
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="default" className="h-7 text-[11px] flex-1" onClick={() => approve(a)}>
                          <Check className="w-3 h-3 mr-1" /> {isEditing ? "Save & Approve" : "Approve"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { if (isEditing) { setEditId(null); setDraft({}); } else { setEditId(a.id); setDraft({}); } }}>
                          {isEditing ? "Cancel" : "Edit"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-destructive" onClick={() => reject(a.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
