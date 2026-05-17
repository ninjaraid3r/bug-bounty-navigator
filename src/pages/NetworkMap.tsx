import { useEffect, useMemo, useState } from "react";
import { Network, ChevronRight, Activity, Bug, Shield, Server, Database, Globe, Layers, ArrowLeft, Map as MapIcon, Lock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReconMapDetail from "@/components/ReconMapDetail";

// Layer model: each target gets a layered map (Edge → DNS → Web → API → Data)
type LayerKey = "edge" | "dns" | "web" | "api" | "data";

interface Layer {
  key: LayerKey;
  label: string;
  icon: any;
  nodes: { id: string; label: string }[];
  attempts: string[]; // canonical attempt keywords for matching agent_tasks/findings
}

interface MappedTarget {
  target: string;
  program: string;
  layers: Layer[];
}

const TARGET_MAPS: MappedTarget[] = [
  {
    target: "target.com",
    program: "HackerOne",
    layers: [
      { key: "edge", label: "Edge / WAF", icon: Shield, nodes: [{ id: "cf", label: "Cloudflare WAF" }, { id: "lb", label: "Load Balancer" }], attempts: ["waf bypass", "cdn", "rate limit"] },
      { key: "dns", label: "DNS / Subdomains", icon: Globe, nodes: [{ id: "root", label: "target.com" }, { id: "wild", label: "*.target.com" }], attempts: ["subdomain", "dns enum", "amass", "subfinder"] },
      { key: "web", label: "Web Tier", icon: Server, nodes: [{ id: "web1", label: "www.target.com" }, { id: "app", label: "app.target.com" }], attempts: ["xss", "csrf", "auth", "tech fingerprint"] },
      { key: "api", label: "API Tier", icon: Layers, nodes: [{ id: "api", label: "api.target.com" }, { id: "graphql", label: "graphql endpoint" }], attempts: ["idor", "graphql", "api fuzzing", "swagger"] },
      { key: "data", label: "Data Layer", icon: Database, nodes: [{ id: "pg", label: "postgres-primary" }, { id: "redis", label: "redis-cache" }], attempts: ["sqli", "nosql", "data exfil", "backup"] },
    ],
  },
  {
    target: "acme-corp.io",
    program: "Bugcrowd",
    layers: [
      { key: "edge", label: "Edge / WAF", icon: Shield, nodes: [{ id: "akamai", label: "Akamai WAF" }], attempts: ["waf bypass", "rate limit"] },
      { key: "dns", label: "DNS / Subdomains", icon: Globe, nodes: [{ id: "api", label: "api.acme-corp.io" }], attempts: ["subdomain", "dns enum"] },
      { key: "web", label: "Web Tier", icon: Server, nodes: [{ id: "web", label: "acme-corp.io" }], attempts: ["xss", "csrf", "auth"] },
      { key: "api", label: "API Tier", icon: Layers, nodes: [{ id: "rest", label: "REST v2" }], attempts: ["idor", "api fuzzing", "jwt"] },
      { key: "data", label: "Data Layer", icon: Database, nodes: [{ id: "mysql", label: "mysql cluster" }], attempts: ["sqli", "data exfil"] },
    ],
  },
  {
    target: "fintech.app",
    program: "Private",
    layers: [
      { key: "edge", label: "Edge / WAF", icon: Shield, nodes: [{ id: "fastly", label: "Fastly + custom WAF" }], attempts: ["waf bypass"] },
      { key: "dns", label: "DNS / Subdomains", icon: Globe, nodes: [{ id: "root", label: "fintech.app" }, { id: "wild", label: "*.fintech.app" }], attempts: ["subdomain", "dns enum"] },
      { key: "web", label: "Web Tier", icon: Server, nodes: [{ id: "app", label: "app.fintech.app" }, { id: "dash", label: "dashboard.fintech.app" }], attempts: ["xss", "auth", "session"] },
      { key: "api", label: "API Tier", icon: Layers, nodes: [{ id: "api", label: "api.fintech.app" }, { id: "webhook", label: "webhooks" }], attempts: ["idor", "graphql", "jwt", "race condition"] },
      { key: "data", label: "Data Layer", icon: Database, nodes: [{ id: "pg", label: "postgres" }, { id: "kafka", label: "kafka stream" }], attempts: ["sqli", "data exfil"] },
    ],
  },
];

interface AttemptHit {
  id: string;
  title: string;
  type: "task" | "finding";
  grade?: string;
  severity?: string;
  created_at: string;
  matched: string;
}

interface ReconMapLite {
  id: string;
  target: string;
  summary: string | null;
  tips: any;
  killchain: any;
  node_count: number;
  created_at: string;
  updated_at: string;
}

export default function NetworkMap() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<MappedTarget | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerKey | null>(null);
  const [hits, setHits] = useState<Record<LayerKey, AttemptHit[]>>({} as any);
  const [loading, setLoading] = useState(false);
  const [reconMaps, setReconMaps] = useState<ReconMapLite[]>([]);
  const [activeReconMap, setActiveReconMap] = useState<ReconMapLite | null>(null);

  useEffect(() => {
    if (!user) return;
    loadReconMaps();
    const ch = supabase
      .channel("network-map-recon")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recon_maps", filter: `user_id=eq.${user.id}` },
        () => loadReconMaps()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadReconMaps() {
    if (!user) return;
    const { data } = await supabase
      .from("recon_maps")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setReconMaps((data as any) || []);
  }

  useEffect(() => {
    if (!user || !selected) return;
    loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selected?.target]);

  async function loadAttempts() {
    if (!user || !selected) return;
    setLoading(true);
    const { data: missions } = await supabase.from("missions").select("id").eq("user_id", user.id).eq("target", selected.target);
    const ids = (missions || []).map((m) => m.id);

    const next: Record<LayerKey, AttemptHit[]> = { edge: [], dns: [], web: [], api: [], data: [] };

    if (ids.length) {
      const [{ data: tasks }, { data: findings }] = await Promise.all([
        supabase.from("agent_tasks").select("id,title,grade,created_at").in("mission_id", ids).order("created_at", { ascending: false }).limit(200),
        supabase.from("findings").select("id,title,severity,created_at").in("mission_id", ids).order("created_at", { ascending: false }).limit(200),
      ]);

      for (const layer of selected.layers) {
        const matches = (s: string) => layer.attempts.some((kw) => s.toLowerCase().includes(kw));
        (tasks || []).forEach((t: any) => {
          if (matches(t.title || "")) {
            next[layer.key].push({ id: t.id, title: t.title, type: "task", grade: t.grade, created_at: t.created_at, matched: layer.attempts.find((kw) => t.title.toLowerCase().includes(kw)) || "" });
          }
        });
        (findings || []).forEach((f: any) => {
          if (matches(f.title || "")) {
            next[layer.key].push({ id: f.id, title: f.title, type: "finding", severity: f.severity, created_at: f.created_at, matched: layer.attempts.find((kw) => f.title.toLowerCase().includes(kw)) || "" });
          }
        });
      }
    }

    setHits(next);
    setLoading(false);
  }

  return (
    <AppLayout
      title="NETWORK MAP"
      subtitle={selected ? `Layered topology — ${selected.target}` : "Mapped infrastructure of your active targets"}
      icon={Network}
      actions={selected ? (
        <Button size="sm" variant="outline" onClick={() => { setSelected(null); setActiveLayer(null); }} className="font-mono text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> All Targets
        </Button>
      ) : null}
    >
      {!selected ? (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TARGET_MAPS.map((m) => (
            <button
              key={m.target}
              onClick={() => setSelected(m)}
              className="text-left bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-sm font-bold text-foreground">{m.target}</h3>
                <Badge variant="outline" className="font-mono text-[9px]">{m.program}</Badge>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mb-3">
                {m.layers.length} layers · {m.layers.reduce((a, l) => a + l.nodes.length, 0)} nodes
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {m.layers.map((l) => (
                  <span key={l.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">
                    {l.label}
                  </span>
                ))}
              </div>
              <div className="text-[10px] font-mono text-primary mt-3">Open map →</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Layered map */}
          <div className="lg:col-span-2 space-y-2">
            {selected.layers.map((layer, idx) => {
              const Icon = layer.icon;
              const layerHits = hits[layer.key] || [];
              const isActive = activeLayer === layer.key;
              return (
                <div key={layer.key}>
                  <button
                    onClick={() => setActiveLayer(isActive ? null : layer.key)}
                    className={`w-full bg-surface-1 border rounded-lg p-4 text-left transition-all ${
                      isActive ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                            L{idx + 1} · {layer.label}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                            {layer.nodes.map((n) => n.label).join(" · ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={layerHits.length ? "default" : "outline"} className="font-mono text-[9px]">
                          {layerHits.length} attempts
                        </Badge>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </button>

                  {isActive && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-primary/30 space-y-2">
                      {/* Nodes */}
                      <div className="grid grid-cols-2 gap-2">
                        {layer.nodes.map((n) => (
                          <Card key={n.id} className="p-2 bg-surface-2 border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              <span className="font-mono text-[11px] text-foreground">{n.label}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                      {/* Attempt keywords */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="font-mono text-[9px] text-muted-foreground uppercase">Probes:</span>
                        {layer.attempts.map((a) => (
                          <span key={a} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">
                            {a}
                          </span>
                        ))}
                      </div>
                      {/* Hits */}
                      <div className="space-y-1.5 pt-2">
                        {loading ? (
                          <p className="font-mono text-[10px] text-muted-foreground">Loading attempts...</p>
                        ) : layerHits.length === 0 ? (
                          <p className="font-mono text-[10px] text-muted-foreground italic">No attempts logged at this layer yet.</p>
                        ) : (
                          layerHits.slice(0, 8).map((h) => (
                            <Card key={h.id} className="p-2 bg-surface-1 border-border">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {h.type === "finding" ? (
                                    <Bug className="w-3 h-3 text-destructive shrink-0" />
                                  ) : (
                                    <Activity className="w-3 h-3 text-primary shrink-0" />
                                  )}
                                  <span className="font-mono text-[11px] text-foreground truncate">{h.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {h.grade && <Badge variant="outline" className="font-mono text-[9px]">{h.grade}</Badge>}
                                  {h.severity && <Badge variant="outline" className="font-mono text-[9px] uppercase">{h.severity}</Badge>}
                                  <span className="font-mono text-[9px] text-muted-foreground">
                                    {new Date(h.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats sidebar */}
          <div className="space-y-3">
            <Card className="p-4 bg-surface-1 border-border">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-3">Coverage</h4>
              <div className="space-y-2">
                {selected.layers.map((l) => {
                  const count = (hits[l.key] || []).length;
                  const pct = Math.min(100, count * 12);
                  return (
                    <div key={l.key}>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-foreground">{l.label}</span>
                        <span className="text-primary">{count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4 bg-surface-1 border-border">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-2">Totals</h4>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Layers" value={selected.layers.length} />
                <Stat label="Nodes" value={selected.layers.reduce((a, l) => a + l.nodes.length, 0)} />
                <Stat label="Attempts" value={Object.values(hits).reduce((a, h) => a + h.length, 0)} />
                <Stat label="Findings" value={Object.values(hits).flat().filter((h) => h.type === "finding").length} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-2 rounded-md p-2 border border-border">
      <div className="font-mono text-[9px] text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-lg font-bold text-primary">{value}</div>
    </div>
  );
}
