import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Beaker, Play, Trash2, ExternalLink, Filter, Plus, Check, X, Terminal, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Poc = {
  id: string;
  user_id: string;
  mission_id: string | null;
  session_id: string | null;
  conversation_id: string | null;
  source_message_id: string | null;
  agent_codename: string;
  title: string;
  summary: string;
  target: string | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  path: string;
  payload: string | null;
  tools: string[];
  tags: string[];
  status: "pending" | "approved" | "declined";
  created_at: string;
};

const SEV_COLOR: Record<Poc["severity"], string> = {
  critical: "text-destructive border-destructive/50 bg-destructive/10",
  high: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  medium: "text-primary border-primary/40 bg-primary/10",
  low: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  info: "text-muted-foreground border-border bg-surface-2",
};

const STATUS_COLOR: Record<Poc["status"], string> = {
  pending: "text-primary border-primary/40 bg-primary/10",
  approved: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  declined: "text-destructive border-destructive/40 bg-destructive/10",
};

export default function ProofOfConcept() {
  const { user } = useAuth();
  const [items, setItems] = useState<Poc[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState<"all" | Poc["status"]>("all");
  const [sevF, setSevF] = useState<"all" | Poc["severity"]>("all");
  const [open, setOpen] = useState<Poc | null>(null);
  const [runFor, setRunFor] = useState<Poc | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("pocs").select("*").order("created_at", { ascending: false });
    setItems((data as Poc[]) || []);
    setLoading(false);
  }

  const filtered = useMemo(() =>
    items.filter(i => (statusF === "all" || i.status === statusF) && (sevF === "all" || i.severity === sevF)),
    [items, statusF, sevF]);

  const counts = {
    all: items.length,
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    declined: items.filter(i => i.status === "declined").length,
  };

  async function setStatus(p: Poc, status: Poc["status"]) {
    const { error } = await (supabase as any).from("pocs").update({ status }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`PoC ${status}`);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this PoC?")) return;
    const { error } = await (supabase as any).from("pocs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setOpen(null);
    load();
  }

  return (
    <AppLayout title="PROOF-OF-CONCEPT" subtitle="Reproducible exploit paths captured by the fleet" icon={Beaker}>
      <div className="p-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(["all", "pending", "approved", "declined"] as const).map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border transition-all ${
                statusF === s ? "border-primary text-primary bg-primary/10 neon-gold-border" : "border-border text-muted-foreground hover:border-primary/40"
              }`}>
              {s} <span className="opacity-60">({(counts as any)[s] ?? 0})</span>
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-2" />
          <select value={sevF} onChange={(e) => setSevF(e.target.value as any)}
            className="bg-surface-2 border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground">
            <option value="all">ALL SEVERITIES</option>
            {(["critical", "high", "medium", "low", "info"] as const).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <div className="flex-1" />
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-3 h-3 mr-1" /> Log PoC
          </Button>
        </div>

        {loading ? (
          <p className="font-mono text-xs text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-lg p-10 text-center">
            <Beaker className="w-10 h-10 text-primary mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-muted-foreground">No PoCs captured yet.</p>
            <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">
              Run a session — Leads emit PoC blocks automatically when they land a working exploit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <button key={p.id} onClick={() => setOpen(p)}
                className="text-left bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/50 transition-all group">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary shrink-0">
                      {p.agent_codename}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${SEV_COLOR[p.severity]}`}>
                      {p.severity.toUpperCase()}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_COLOR[p.status]}`}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{p.title}</h3>
                {p.target && (
                  <p className="text-[10px] font-mono text-muted-foreground/80 mb-2 truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {p.target}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-3">{p.summary}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.tags.slice(0, 4).map(t => (
                    <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">#{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setRunFor(p); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setRunFor(p); } }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> RUN NOW
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <PocDetailSheet
        poc={open}
        onClose={() => setOpen(null)}
        onStatus={setStatus}
        onDelete={del}
        onRun={(p) => { setOpen(null); setRunFor(p); }}
      />

      <RunNowDialog poc={runFor} onClose={() => setRunFor(null)} />

      <AddPocDialog open={addOpen} onClose={() => { setAddOpen(false); load(); }} />
    </AppLayout>
  );
}

function PocDetailSheet({ poc, onClose, onStatus, onDelete, onRun }: {
  poc: Poc | null;
  onClose: () => void;
  onStatus: (p: Poc, s: Poc["status"]) => void;
  onDelete: (id: string) => void;
  onRun: (p: Poc) => void;
}) {
  return (
    <Sheet open={!!poc} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {poc && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-primary">{poc.title}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${SEV_COLOR[poc.severity]}`}>{poc.severity.toUpperCase()}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${STATUS_COLOR[poc.status]}`}>{poc.status.toUpperCase()}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">{poc.agent_codename}</span>
                {poc.session_id && (
                  <Link to={`/commander/sessions/${poc.session_id}`} onClick={onClose}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> View Source Session
                  </Link>
                )}
              </div>
              {poc.target && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Target</div>
                  <div className="font-mono text-xs text-foreground break-all">{poc.target}</div>
                </div>
              )}
              <Section label="Summary — How we arrived at this PoC">
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{poc.summary}</p>
              </Section>
              <Section label="Path — Steps to reproduce">
                <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap bg-surface-2 border border-border rounded p-3">{poc.path}</pre>
              </Section>
              {poc.payload && (
                <Section label="Payload / Request">
                  <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap bg-surface-2 border border-border rounded p-3 overflow-x-auto">{poc.payload}</pre>
                </Section>
              )}
              {poc.tools?.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Tools</div>
                  <div className="flex flex-wrap gap-1">
                    {poc.tools.map(t => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-surface-2 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {poc.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {poc.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-surface-2 text-muted-foreground">#{t}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                <Button onClick={() => onRun(poc)} className="bg-primary text-primary-foreground hover:bg-primary/90 neon-gold-box">
                  <Play className="w-3 h-3 mr-1" /> Run Now
                </Button>
                {poc.status !== "approved" && (
                  <Button variant="outline" size="sm" onClick={() => onStatus(poc, "approved")}>
                    <Check className="w-3 h-3 mr-1" /> Approve
                  </Button>
                )}
                {poc.status !== "declined" && (
                  <Button variant="outline" size="sm" onClick={() => onStatus(poc, "declined")} className="text-destructive">
                    <X className="w-3 h-3 mr-1" /> Decline
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDelete(poc.id)} className="text-destructive ml-auto">
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function RunNowDialog({ poc, onClose }: { poc: Poc | null; onClose: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"sandbox" | "active" | "queue">("sandbox");
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);

  useEffect(() => { if (!poc) { setOutput(""); setMode("sandbox"); } }, [poc]);

  async function execute() {
    if (!poc || !user) return;
    setRunning(true); setOutput("");

    if (mode === "sandbox") {
      // Simulated demo sandbox: stream a fake but realistic trace via ai gateway using edge function tool-sandbox pattern
      try {
        const resp = await supabase.functions.invoke("tool-sandbox", {
          body: {
            toolName: `PoC Replay — ${poc.title}`,
            toolDescription: `Simulate this reproducible proof-of-concept in a sandboxed environment. Show realistic command output as if the operator were watching the exploit run against a lab target. Use fictional but plausible responses.`,
            toolUseCase: "Replay a captured proof-of-concept safely to observe expected behavior.",
            messages: [{
              role: "user",
              content: `Replay this PoC end-to-end and produce a realistic terminal transcript.\n\nTITLE: ${poc.title}\nTARGET: ${poc.target || "example.com"}\nSEVERITY: ${poc.severity}\n\nPATH:\n${poc.path}\n\nPAYLOAD:\n${poc.payload || "(none)"}\n\nTOOLS: ${poc.tools.join(", ") || "n/a"}`,
            }],
          },
        });
        if ((resp as any).error) throw new Error((resp as any).error.message);
        // tool-sandbox streams SSE; the invoke helper returns .data as ReadableStream or string
        const data = (resp as any).data;
        if (typeof data === "string") setOutput(data);
        else if (data instanceof ReadableStream) {
          const reader = data.getReader();
          const decoder = new TextDecoder();
          let acc = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") continue;
              try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) { acc += delta; setOutput(acc); }
              } catch {}
            }
          }
        } else {
          setOutput(JSON.stringify(data, null, 2));
        }
        toast.success("Sandbox replay complete");
      } catch (e: any) {
        setOutput(`ERROR: ${e.message}`);
        toast.error(e.message);
      }
    } else if (mode === "active") {
      // Send into current active mission conversation as an operator message
      const { data: missions } = await supabase
        .from("missions").select("id")
        .eq("user_id", user.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1);
      const mid = missions?.[0]?.id;
      if (!mid) { setRunning(false); return toast.error("No active mission — start one on Recon first."); }
      const { data: convo } = await supabase
        .from("conversations").select("id")
        .eq("mission_id", mid).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!convo) { setRunning(false); return toast.error("No conversation on the active mission."); }
      const body = `**RUN PoC: ${poc.title}**\n\nTarget: ${poc.target || "(current)"}\nSeverity: ${poc.severity}\n\n**Path:**\n${poc.path}\n\n${poc.payload ? `**Payload:**\n\`\`\`\n${poc.payload}\n\`\`\`\n` : ""}`;
      const { error } = await supabase.from("messages").insert({
        conversation_id: convo.id, user_id: user.id, role: "user", sender_name: "Operator", content: body,
      });
      if (error) { setOutput(`ERROR: ${error.message}`); toast.error(error.message); }
      else { setOutput("PoC injected into active session channel. Leads are picking it up."); toast.success("Sent to active session"); }
    } else {
      setOutput("Queued for scheduled runs — coming soon.");
    }
    setRunning(false);
  }

  return (
    <Dialog open={!!poc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">Run PoC</DialogTitle>
          <DialogDescription className="font-mono text-xs">{poc?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground mb-2 block">Where do you want to run this?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <ModeBtn active={mode === "sandbox"} onClick={() => setMode("sandbox")} title="Demo Sandbox" desc="Safe simulated replay of the PoC — no real target hit." icon={Terminal} />
              <ModeBtn active={mode === "active"} onClick={() => setMode("active")} title="Active Session" desc="Inject the PoC into your current mission channel for the Leads to execute." icon={MessageSquare} />
              <ModeBtn active={mode === "queue"} onClick={() => setMode("queue")} title="Queue (soon)" desc="Save for scheduled runs & chained PoCs." icon={Play} disabled />
            </div>
          </div>

          {output && (
            <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap bg-surface-2 border border-border rounded p-3 max-h-72 overflow-auto">{output}</pre>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={execute} disabled={running || mode === "queue"} className="bg-primary text-primary-foreground hover:bg-primary/90 neon-gold-box">
            {running ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            {running ? "Running…" : "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeBtn({ active, onClick, title, desc, icon: Icon, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-left p-3 rounded border transition-all ${
        active ? "border-primary bg-primary/10 neon-gold-border" : "border-border bg-surface-2 hover:border-primary/40"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <Icon className={`w-4 h-4 mb-1 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div className={`font-mono text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>{title}</div>
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
    </button>
  );
}

function AddPocDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    agent_codename: "OPERATOR", title: "", summary: "", target: "",
    severity: "medium", path: "", payload: "", tools: "", tags: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!user) return;
    if (!form.title.trim() || !form.summary.trim() || !form.path.trim()) return toast.error("Title, summary and path are required");
    setSaving(true);
    const { error } = await (supabase as any).from("pocs").insert({
      user_id: user.id,
      agent_codename: form.agent_codename,
      title: form.title.trim(),
      summary: form.summary.trim(),
      target: form.target.trim() || null,
      severity: form.severity,
      path: form.path.trim(),
      payload: form.payload.trim() || null,
      tools: form.tools.split(",").map(t => t.trim()).filter(Boolean),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      status: "pending",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("PoC logged");
    setForm({ agent_codename: "OPERATOR", title: "", summary: "", target: "", severity: "medium", path: "", payload: "", tools: "", tags: "" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">Log Proof-of-Concept</DialogTitle>
          <DialogDescription className="font-mono text-xs">Capture a reproducible exploit path.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Agent</label>
              <Input value={form.agent_codename} onChange={e => setForm({ ...form, agent_codename: e.target.value.toUpperCase() })} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground">
                {["critical","high","medium","low","info"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <Field label="Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="font-mono text-xs" /></Field>
          <Field label="Target"><Input value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="https://…" className="font-mono text-xs" /></Field>
          <Field label="Summary"><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className="font-mono text-xs h-20" /></Field>
          <Field label="Path (numbered steps)"><Textarea value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} className="font-mono text-xs h-24" placeholder={"1. …\n2. …\n3. …"} /></Field>
          <Field label="Payload (optional)"><Textarea value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })} className="font-mono text-xs h-16" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tools (comma)"><Input value={form.tools} onChange={e => setForm({ ...form, tools: e.target.value })} className="font-mono text-xs" placeholder="burp, sqlmap" /></Field>
            <Field label="Tags (comma)"><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="font-mono text-xs" placeholder="idor, auth" /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Saving…" : "Save PoC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
