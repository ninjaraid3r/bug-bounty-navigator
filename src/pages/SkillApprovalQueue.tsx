import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Loader2, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
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

  const grouped = items.reduce((acc: Record<string, any[]>, a) => {
    (acc[a.agent_codename] ||= []).push(a);
    return acc;
  }, {});

  return (
    <AppLayout
      title="SKILL APPROVAL QUEUE"
      subtitle={`${items.length} skill${items.length === 1 ? "" : "s"} awaiting your review`}
      icon={ShieldCheck}
      actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
    >
      <div className="p-5 space-y-5 max-w-5xl mx-auto">
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
                  return (
                    <div key={a.id} className="border border-primary/40 rounded-md p-3 bg-primary/5">
                      {isEditing ? (
                        <>
                          <Input className="h-7 text-xs font-mono mb-1" value={draft.name ?? a.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                          <Input className="h-7 text-xs font-mono mb-2" value={draft.description ?? a.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                          <Textarea rows={5} className="text-[10px] font-mono mb-2" value={draft.prompt_template ?? a.prompt_template} onChange={(e) => setDraft({ ...draft, prompt_template: e.target.value })} />
                        </>
                      ) : (
                        <>
                          <div className="font-mono text-sm font-semibold text-foreground truncate">{a.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">{a.category} · {a.source}</div>
                          {a.description && <p className="text-xs text-muted-foreground mb-1.5">{a.description}</p>}
                          <pre className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2 rounded border border-border line-clamp-4 whitespace-pre-wrap">{a.prompt_template}</pre>
                        </>
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
