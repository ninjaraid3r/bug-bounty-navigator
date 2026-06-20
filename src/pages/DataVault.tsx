import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Database, Check, X, Clock, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Status = "pending" | "confirmed" | "rejected";
type Source = "agent_learnings" | "agent_memory" | "agent_opinions" | "agent_recommendations" | "findings";

interface VaultItem {
  id: string;
  source: Source;
  title: string;
  body: string;
  meta: string;
  status: Status;
  created_at: string;
}

const SOURCE_LABEL: Record<Source, string> = {
  agent_learnings: "Learning",
  agent_memory: "Memory",
  agent_opinions: "Opinion",
  agent_recommendations: "Recommendation",
  findings: "Finding",
};

const SOURCE_COLOR: Record<Source, string> = {
  agent_learnings: "text-primary border-primary/40 bg-primary/10",
  agent_memory: "text-foreground border-border bg-surface-2",
  agent_opinions: "text-primary/70 border-primary/20 bg-primary/5",
  agent_recommendations: "text-primary border-primary/40 bg-primary/10",
  findings: "text-destructive border-destructive/40 bg-destructive/10",
};

export default function DataVault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Status>("pending");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Source | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const fetchOne = async (table: Source, mapper: (r: any) => Partial<VaultItem>) => {
      const { data } = await (supabase as any).from(table).select("*").eq("user_id", user.id).limit(100);
      return (data || []).map((r: any) => ({
        id: r.id, source: table, status: (r.vault_status as Status) || "pending",
        created_at: r.created_at, ...mapper(r),
      }));
    };
    const all = await Promise.all([
      fetchOne("agent_learnings", r => ({ title: r.title || r.category || "Learning", body: r.body || r.content || "", meta: `${r.agent_codename || ""} · ${r.severity || r.category || ""}` })),
      fetchOne("agent_memory", r => ({ title: r.summary?.slice(0, 80) || "Memory entry", body: r.summary || "", meta: r.agent_codename || "" })),
      fetchOne("agent_opinions", r => ({ title: r.opinion?.slice(0, 80) || "Opinion", body: r.opinion || "", meta: `${r.agent_codename || ""} · ${r.topic || ""}` })),
      fetchOne("agent_recommendations", r => ({ title: r.title || "Recommendation", body: r.body || r.content || "", meta: `${r.agent_codename || ""} · ${r.kind || ""}` })),
      fetchOne("findings", r => ({ title: r.title || "Finding", body: r.description || "", meta: `${r.severity || ""} · ${r.affected_url || ""}` })),
    ]);
    setItems(all.flat() as VaultItem[]);
    setLoading(false);
  }

  async function setStatus(item: VaultItem, status: Status) {
    const { error } = await (supabase as any).from(item.source).update({ vault_status: status }).eq("id", item.id);
    if (error) { toast({ title: "Update failed", description: error.message }); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    toast({ title: status === "confirmed" ? "Confirmed → knowledge base" : status === "rejected" ? "Rejected" : "Reset" });
  }

  const filtered = items.filter(i => i.status === tab && (filter === "all" || i.source === filter));
  const counts = { pending: items.filter(i => i.status === "pending").length, confirmed: items.filter(i => i.status === "confirmed").length, rejected: items.filter(i => i.status === "rejected").length };

  return (
    <AppLayout title="DATA VAULT" subtitle="Curate what the agents learned — confirm to graduate into the knowledge base" icon={Database}>
      <div className="p-5 space-y-4 max-w-5xl">
        {/* Status tabs */}
        <div className="flex items-center gap-2">
          {(["pending", "confirmed", "rejected"] as Status[]).map(s => (
            <button key={s} onClick={() => setTab(s)} className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider border transition-all ${tab === s ? "bg-primary/10 text-primary border-primary neon-gold-box" : "bg-surface-1 text-muted-foreground border-border hover:border-primary/40"}`}>
              {s === "pending" && <Clock className="w-3 h-3 inline mr-1.5" />}
              {s === "confirmed" && <Check className="w-3 h-3 inline mr-1.5" />}
              {s === "rejected" && <X className="w-3 h-3 inline mr-1.5" />}
              {s} <span className="ml-1 text-[10px] opacity-70">({counts[s]})</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-surface-1 border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              <option value="all">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="font-mono text-xs text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-1 border border-border rounded-lg p-10 text-center">
            <Database className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-mono text-xs text-muted-foreground">No {tab} items yet.</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">Run an End-of-Session Overview from the Recon tab to populate.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className={`bg-surface-1 border rounded-lg overflow-hidden transition-all ${isOpen ? "border-primary" : "border-border hover:border-primary/30"}`}>
                  <button onClick={() => setOpenId(isOpen ? null : item.id)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase shrink-0 ${SOURCE_COLOR[item.source]}`}>
                      {SOURCE_LABEL[item.source]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-foreground truncate">{item.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">{item.meta} · {new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                      <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap bg-surface-2 p-3 rounded border border-border">{item.body || "(no body)"}</pre>
                      <div className="flex gap-2">
                        {item.status !== "confirmed" && (
                          <button onClick={() => setStatus(item, "confirmed")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90">
                            <Check className="w-3 h-3" /> Confirm → Knowledge Base
                          </button>
                        )}
                        {item.status !== "rejected" && (
                          <button onClick={() => setStatus(item, "rejected")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-destructive/10 text-destructive border border-destructive/40 text-xs font-mono hover:bg-destructive/20">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        )}
                        {item.status !== "pending" && (
                          <button onClick={() => setStatus(item, "pending")} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-2 text-muted-foreground border border-border text-xs font-mono hover:border-primary/40">
                            <Clock className="w-3 h-3" /> Move back to Pending
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
