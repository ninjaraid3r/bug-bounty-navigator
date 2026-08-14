import { useEffect, useMemo, useState } from "react";
import { Sparkles, Plus, Check, X, Trash2, Filter } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

type Pattern = {
  id: string;
  agent_codename: string;
  category: string;
  title: string;
  description: string;
  example: string | null;
  tags: string[];
  status: "pending" | "approved" | "declined";
  commander_note: string | null;
  created_at: string;
};

const STATUSES: Array<{ id: "all" | Pattern["status"]; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
];

const AGENT_OPTIONS = ["OPERATOR", "COMMANDER", "PHANTOM", "VIPER", "SPECTER", "CARTOGRAPHER", "RAIDER"];
const CATEGORY_OPTIONS = ["recon", "auth", "injection", "business-logic", "api", "stealth", "post-exploit", "misc"];

const STATUS_COLOR: Record<Pattern["status"], string> = {
  pending: "text-primary border-primary/40 bg-primary/10",
  approved: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  declined: "text-destructive border-destructive/40 bg-destructive/10",
};

export default function Patterns() {
  const { user } = useAuth();
  const [items, setItems] = useState<Pattern[]>([]);
  const [status, setStatus] = useState<"all" | Pattern["status"]>("pending");
  const [agent, setAgent] = useState<string>("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [openReview, setOpenReview] = useState<Pattern | null>(null);
  const [note, setNote] = useState("");

  const [form, setForm] = useState({
    agent_codename: "OPERATOR",
    category: "recon",
    title: "",
    description: "",
    example: "",
    tags: "",
  });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase
      .from("patterns")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Pattern[]) || []);
  }

  const filtered = useMemo(
    () => items.filter(i =>
      (status === "all" || i.status === status) &&
      (agent === "all" || i.agent_codename === agent)
    ),
    [items, status, agent]
  );

  async function submitPattern() {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    const { error } = await supabase.from("patterns").insert({
      user_id: user.id,
      agent_codename: form.agent_codename,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      example: form.example.trim() || null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Pattern queued for Commander review");
    setOpenAdd(false);
    setForm({ agent_codename: "OPERATOR", category: "recon", title: "", description: "", example: "", tags: "" });
    load();
  }

  async function decide(p: Pattern, newStatus: "approved" | "declined") {
    const { error } = await supabase.from("patterns").update({
      status: newStatus,
      commander_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "approved" ? "Pattern approved" : "Pattern declined");
    setOpenReview(null); setNote("");
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this pattern?")) return;
    const { error } = await supabase.from("patterns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <AppLayout title="PATTERNS" subtitle="Agent-observed patterns · Commander approves the knowledge base" icon={Sparkles}>
      <div className="p-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${
                status === s.id ? "border-primary text-primary bg-primary/10 neon-gold-border" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {s.label.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-2" />
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground"
          >
            <option value="all">ALL AGENTS</option>
            {AGENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setOpenAdd(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-3 h-3 mr-1" /> Add Pattern
          </Button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-lg p-10 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-muted-foreground">No patterns match this filter yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary shrink-0">
                      {p.agent_codename}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground truncate">{p.category}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_COLOR[p.status]}`}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                {p.example && (
                  <pre className="text-[10px] font-mono bg-surface-2 border border-border rounded p-2 overflow-x-auto text-foreground/90 mb-2">{p.example}</pre>
                )}
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.tags.map(t => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                )}
                {p.commander_note && (
                  <p className="text-[10px] font-mono text-primary/80 border-l-2 border-primary/40 pl-2 my-2">
                    Commander: {p.commander_note}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {p.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => { setOpenReview(p); setNote(""); }} className="h-7 text-[10px]">
                        Commander Review
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => del(p.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">Add Pattern</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Log a new pattern. It enters the queue as <span className="text-primary">pending</span> until the Commander approves.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Agent</label>
                <select
                  value={form.agent_codename}
                  onChange={(e) => setForm({ ...form, agent_codename: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground"
                >
                  {AGENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground"
                >
                  {CATEGORY_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="font-mono text-xs h-20" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Example / Payload (optional)</label>
              <Textarea value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} className="font-mono text-xs h-16" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="font-mono text-xs" placeholder="jwt, bypass, oauth" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={submitPattern} className="bg-primary text-primary-foreground hover:bg-primary/90">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!openReview} onOpenChange={(v) => !v && setOpenReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">Commander Review</DialogTitle>
            <DialogDescription className="font-mono text-xs">{openReview?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{openReview?.description}</p>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Commander Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="font-mono text-xs h-20" placeholder="Why approve / decline, how team should use it…" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => openReview && decide(openReview, "declined")} className="text-destructive">
              <X className="w-3 h-3 mr-1" /> Decline
            </Button>
            <Button onClick={() => openReview && decide(openReview, "approved")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
