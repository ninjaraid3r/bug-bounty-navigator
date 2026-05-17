import { type ReconNodeRow, IMPACT_COLORS } from "./ReconMindMap";
import { Globe, Server, Network as NetIcon, Cloud, Lock, Cpu, FileCode, Hash, Target } from "lucide-react";

const TYPE_ICON: Record<string, any> = {
  root: Target, domain: Globe, subdomain: Globe, ip: NetIcon,
  endpoint: FileCode, bucket: Cloud, panel: Lock, tech: Cpu, note: Hash,
};

const TYPE_ORDER = ["root", "domain", "subdomain", "ip", "endpoint", "panel", "bucket", "tech", "note"];

export default function ReconCanvas({
  nodes,
  onNodeClick,
}: {
  nodes: ReconNodeRow[];
  onNodeClick?: (n: ReconNodeRow) => void;
}) {
  if (!nodes.length) {
    return (
      <div className="h-[420px] grid place-items-center border border-border rounded-md bg-surface-2/30 text-xs font-mono text-muted-foreground">
        No assets captured yet — Cartographer will populate the canvas as he discovers them.
      </div>
    );
  }

  const grouped = nodes.reduce((acc, n) => {
    (acc[n.node_type] ||= []).push(n);
    return acc;
  }, {} as Record<string, ReconNodeRow[]>);

  const sortedTypes = Object.keys(grouped).sort(
    (a, b) => (TYPE_ORDER.indexOf(a) === -1 ? 99 : TYPE_ORDER.indexOf(a)) - (TYPE_ORDER.indexOf(b) === -1 ? 99 : TYPE_ORDER.indexOf(b))
  );

  return (
    <div className="border border-border rounded-md bg-background p-4 max-h-[600px] overflow-y-auto space-y-5">
      {sortedTypes.map((type) => {
        const Icon = TYPE_ICON[type] || Hash;
        const items = grouped[type];
        return (
          <section key={type}>
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary">
                {type} <span className="text-muted-foreground">· {items.length}</span>
              </h4>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map((n) => {
                const impactColor = n.impact && IMPACT_COLORS[n.impact] ? IMPACT_COLORS[n.impact] : "hsl(220 10% 30%)";
                const note = (n.metadata as any)?.note;
                return (
                  <button
                    key={n.id}
                    onClick={() => onNodeClick?.(n)}
                    className="text-left rounded-md border bg-surface-2/40 hover:bg-surface-2 hover:border-primary/60 transition-all p-2.5 group"
                    style={{ borderLeft: `3px solid ${impactColor}` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-foreground truncate group-hover:text-primary">
                        {n.label}
                      </span>
                      {n.impact && (
                        <span
                          className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${impactColor}22`, color: impactColor, border: `1px solid ${impactColor}55` }}
                        >
                          {n.impact}
                        </span>
                      )}
                    </div>
                    {(n.details || note) && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.details || note}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
