import { Zap, Plus, Play, Pause, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useState } from "react";

interface Workflow {
  name: string;
  trigger: string;
  steps: string[];
  enabled: boolean;
  lastRun: string;
}

const initial: Workflow[] = [
  { name: "Daily Recon Sweep", trigger: "Cron: 06:00 UTC", steps: ["amass enum", "subfinder", "httpx probe", "nuclei tags:exposure"], enabled: true, lastRun: "2h ago" },
  { name: "New Subdomain → Scan", trigger: "On: subdomain discovered", steps: ["httpx", "katana crawl", "nuclei full"], enabled: true, lastRun: "23m ago" },
  { name: "JS Endpoint Harvest", trigger: "Cron: hourly", steps: ["fetch JS", "extract endpoints", "diff vs known"], enabled: true, lastRun: "11m ago" },
  { name: "S3 Bucket Hunter", trigger: "Manual", steps: ["permutate names", "check public", "report findings"], enabled: false, lastRun: "3d ago" },
  { name: "CVE Watchlist", trigger: "On: new CVE published", steps: ["match tech stack", "alert if hit", "create task"], enabled: true, lastRun: "yesterday" },
];

export default function Automation() {
  const [flows, setFlows] = useState(initial);

  return (
    <AppLayout
      title="AUTOMATION"
      subtitle="Always-on workflows and scheduled hunts"
      icon={Zap}
      actions={
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Workflow
        </button>
      }
    >
      <div className="p-5 space-y-3">
        {flows.map((f, i) => (
          <div key={f.name} className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${f.enabled ? "bg-primary/10 neon-gold-box" : "bg-surface-2"}`}>
                  <Zap className={`w-4 h-4 ${f.enabled ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-foreground">{f.name}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground">{f.trigger}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{f.lastRun}
                </span>
                <button
                  onClick={() => setFlows(prev => prev.map((x, idx) => idx === i ? { ...x, enabled: !x.enabled } : x))}
                  className={`p-1.5 rounded ${f.enabled ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted-foreground"} hover:bg-primary/20`}
                >
                  {f.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
              {f.steps.map((s, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">
                  {idx + 1}. {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
