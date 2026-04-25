import { Network } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const nodes = [
  { id: "internet", label: "Internet", x: 50, y: 10, type: "external" },
  { id: "wafv1", label: "Cloudflare WAF", x: 50, y: 25, type: "edge" },
  { id: "lb", label: "Load Balancer", x: 50, y: 40, type: "edge" },
  { id: "web1", label: "web-01", x: 25, y: 60, type: "host" },
  { id: "web2", label: "web-02", x: 50, y: 60, type: "host" },
  { id: "api", label: "api-cluster", x: 75, y: 60, type: "host" },
  { id: "db", label: "postgres-primary", x: 35, y: 85, type: "db" },
  { id: "redis", label: "redis-cache", x: 65, y: 85, type: "db" },
];

const edges = [
  ["internet", "wafv1"], ["wafv1", "lb"], ["lb", "web1"], ["lb", "web2"], ["lb", "api"],
  ["web1", "db"], ["web2", "db"], ["api", "db"], ["api", "redis"],
];

const typeColor: Record<string, string> = {
  external: "fill-muted text-muted-foreground",
  edge: "fill-primary/20 text-primary",
  host: "fill-surface-2 text-foreground",
  db: "fill-primary/10 text-primary/80",
};

export default function NetworkMap() {
  return (
    <AppLayout title="NETWORK MAP" subtitle="Topology view of mapped infrastructure" icon={Network}>
      <div className="p-5">
        <div className="bg-surface-1 border border-border rounded-lg p-6">
          <svg viewBox="0 0 100 100" className="w-full h-[500px]">
            {edges.map(([from, to]) => {
              const a = nodes.find(n => n.id === from)!;
              const b = nodes.find(n => n.id === to)!;
              return (
                <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="hsl(var(--primary) / 0.3)" strokeWidth="0.2" strokeDasharray="0.5 0.5" />
              );
            })}
            {nodes.map(n => (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r="3" className={typeColor[n.type]}
                  stroke="hsl(var(--primary))" strokeWidth="0.2" />
                <text x={n.x} y={n.y + 5.5} textAnchor="middle" fontSize="1.8"
                  fill="hsl(var(--foreground))" fontFamily="monospace">{n.label}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Nodes", value: nodes.length },
            { label: "Edges", value: edges.length },
            { label: "Hosts", value: nodes.filter(n => n.type === "host").length },
            { label: "Databases", value: nodes.filter(n => n.type === "db").length },
          ].map(s => (
            <div key={s.label} className="bg-surface-1 border border-border rounded-lg p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">{s.label}</div>
              <div className="text-xl font-mono font-bold text-primary">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
