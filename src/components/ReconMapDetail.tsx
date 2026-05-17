import { useEffect, useState } from "react";
import { Lightbulb, Crosshair, Loader2, Lock, Map as MapIcon, Network as NetIcon, LayoutGrid, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import ReconMindMap, { type ReconNodeRow, IMPACT_COLORS } from "./ReconMindMap";
import ReconCanvas from "./ReconCanvas";

interface Tip { area?: string; rationale?: string; severity?: string; next_test?: string }
interface KillStage { stage?: string; tools?: string[]; trigger?: string; action?: string }

interface ReconMapRow {
  id: string;
  target: string;
  summary: string | null;
  tips: Tip[] | null;
  killchain: KillStage[] | null;
  node_count: number;
  created_at: string;
  updated_at: string;
}

type ViewMode = "graph" | "canvas" | "split";

export default function ReconMapDetail({ map, onBack, defaultView = "graph" }: { map: ReconMapRow; onBack?: () => void; defaultView?: ViewMode }) {
  const [nodes, setNodes] = useState<ReconNodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [killOpen, setKillOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(defaultView);
  const [selected, setSelected] = useState<ReconNodeRow | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("recon_map_nodes")
      .select("id, node_key, parent_key, label, node_type, impact, details, metadata")
      .eq("map_id", map.id)
      .order("created_at", { ascending: true });
    setNodes((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`recon-map-${map.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recon_map_nodes", filter: `map_id=eq.${map.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id]);

  const counts = nodes.reduce((acc, n) => {
    acc[n.node_type] = (acc[n.node_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const impactCounts = nodes.reduce((acc, n) => {
    if (n.impact) acc[n.impact] = (acc[n.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tips: Tip[] = Array.isArray(map.tips) ? map.tips : [];
  const kc: KillStage[] = Array.isArray(map.killchain) ? map.killchain : [];

  const ViewBtn = ({ mode, icon: Icon, label }: { mode: ViewMode; icon: any; label: string }) => (
    <Button
      size="sm"
      variant={view === mode ? "default" : "outline"}
      onClick={() => setView(mode)}
      className="h-7 text-[10px] font-mono px-2"
    >
      <Icon className="w-3 h-3 mr-1" /> {label}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {onBack && (
          <Button size="sm" variant="ghost" onClick={onBack} className="h-7 text-[11px]">
            ← Back
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MapIcon className="w-4 h-4 text-primary" />
            <h3 className="font-mono text-sm font-bold text-primary tracking-wider neon-gold truncate">
              {map.target}
            </h3>
            <Badge variant="outline" className="text-[9px]"><Lock className="w-2.5 h-2.5 mr-1" /> Permanent</Badge>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {map.node_count} nodes · updated {new Date(map.updated_at).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-surface-2/40">
          <ViewBtn mode="graph" icon={NetIcon} label="Graph" />
          <ViewBtn mode="canvas" icon={LayoutGrid} label="Canvas" />
          <ViewBtn mode="split" icon={Columns} label="Both" />
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setTipsOpen(true)} disabled={!tips.length}>
          <Lightbulb className="w-3 h-3 mr-1" /> TIPS ({tips.length})
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setKillOpen(true)} disabled={!kc.length}>
          <Crosshair className="w-3 h-3 mr-1" /> KILL-CHAIN ({kc.length})
        </Button>
      </div>

      {/* Impact rating legend */}
      {Object.keys(impactCounts).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <span className="text-muted-foreground uppercase tracking-widest">Attack Impact:</span>
          {["critical", "high", "medium", "low", "info"].map((lvl) =>
            impactCounts[lvl] ? (
              <span
                key={lvl}
                className="px-1.5 py-0.5 rounded uppercase"
                style={{
                  background: `${IMPACT_COLORS[lvl]}1f`,
                  color: IMPACT_COLORS[lvl],
                  border: `1px solid ${IMPACT_COLORS[lvl]}55`,
                }}
              >
                {lvl} · {impactCounts[lvl]}
              </span>
            ) : null
          )}
        </div>
      )}

      {loading ? (
        <div className="h-[480px] grid place-items-center border border-border rounded-md bg-surface-2/30">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : view === "split" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <ReconMindMap nodes={nodes} onNodeClick={setSelected} />
          <ReconCanvas nodes={nodes} onNodeClick={setSelected} />
        </div>
      ) : view === "canvas" ? (
        <ReconCanvas nodes={nodes} onNodeClick={setSelected} />
      ) : (
        <ReconMindMap nodes={nodes} onNodeClick={setSelected} />
      )}

      {/* Professional summary */}
      <div className="rounded-md border border-border bg-surface-2/40 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Professional Summary</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(counts).map(([k, v]) => (
              <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                {k} · {v}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-foreground/90 leading-relaxed">
          {map.summary || "No summary captured yet — Cartographer will populate this on the next mapping run."}
        </p>
        <div className="text-[10px] font-mono text-muted-foreground">
          Mapped first on {new Date(map.created_at).toLocaleString()}.
        </div>
      </div>

      {/* Node detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-l border-border">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-primary tracking-wider flex items-center gap-2 break-all">
                  {selected.label}
                </SheetTitle>
                <SheetDescription className="text-[11px] font-mono flex flex-wrap gap-2 items-center">
                  <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground">{selected.node_type}</span>
                  {selected.impact && (
                    <span
                      className="px-1.5 py-0.5 rounded uppercase"
                      style={{
                        background: `${IMPACT_COLORS[selected.impact]}1f`,
                        color: IMPACT_COLORS[selected.impact],
                        border: `1px solid ${IMPACT_COLORS[selected.impact]}55`,
                      }}
                    >
                      Impact: {selected.impact}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Key</div>
                  <code className="text-[10px] font-mono text-foreground break-all">{selected.node_key}</code>
                </div>
                {selected.parent_key && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Parent</div>
                    <code className="text-[10px] font-mono text-foreground break-all">{selected.parent_key}</code>
                  </div>
                )}
                {selected.details && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Details</div>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{selected.details}</p>
                  </div>
                )}
                {(selected.metadata as any)?.note && (
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Note</div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{(selected.metadata as any).note}</p>
                  </div>
                )}
                {!selected.details && !(selected.metadata as any)?.note && (
                  <p className="text-[11px] font-mono text-muted-foreground italic">
                    No details yet — Cartographer will enrich this node as recon progresses.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* TIPS drawer */}
      <Sheet open={tipsOpen} onOpenChange={setTipsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
          <SheetHeader>
            <SheetTitle className="font-mono text-primary tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Cartographer Tips · {map.target}
            </SheetTitle>
            <SheetDescription className="text-[11px] font-mono">
              Recommended areas of interest for bug-hunting and exploitation.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {tips.length === 0 && <p className="text-xs text-muted-foreground font-mono">No tips yet.</p>}
            {tips.map((t, i) => (
              <div key={i} className="border border-border rounded-md p-3 bg-surface-2/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-foreground">{t.area || `Tip ${i + 1}`}</span>
                  {t.severity && (
                    <span className={`text-[9px] font-mono uppercase ${t.severity === "high" ? "text-destructive" : t.severity === "medium" ? "text-primary" : "text-muted-foreground"}`}>
                      {t.severity}
                    </span>
                  )}
                </div>
                {t.rationale && <p className="text-[11px] text-muted-foreground mb-1.5">{t.rationale}</p>}
                {t.next_test && (
                  <div className="text-[10px] font-mono text-primary border-l-2 border-primary/40 pl-2">
                    Next test: {t.next_test}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* KILL-CHAIN drawer */}
      <Sheet open={killOpen} onOpenChange={setKillOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-l border-border">
          <SheetHeader>
            <SheetTitle className="font-mono text-primary tracking-wider flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> Recommended Kill-Chain · {map.target}
            </SheetTitle>
            <SheetDescription className="text-[11px] font-mono">
              Kill-chain testers Cartographer recommends based on the current attack surface.
            </SheetDescription>
          </SheetHeader>
          <ol className="mt-4 space-y-2">
            {kc.length === 0 && <p className="text-xs text-muted-foreground font-mono">No kill-chain stages yet.</p>}
            {kc.map((k, i) => (
              <li key={i} className="border border-border rounded-md p-3 bg-surface-2/40 relative">
                <div className="absolute -left-2 -top-2 w-5 h-5 rounded-full bg-primary text-background text-[10px] font-mono font-bold grid place-items-center">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary">{k.stage || "Stage"}</span>
                </div>
                {k.trigger && <div className="text-[10px] text-muted-foreground italic mb-1">Trigger: {k.trigger}</div>}
                {k.action && <p className="text-[11px] text-foreground mb-1.5">{k.action}</p>}
                {Array.isArray(k.tools) && k.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {k.tools.map((t, ti) => (
                      <span key={ti} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background border border-primary/30 text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </div>
  );
}
