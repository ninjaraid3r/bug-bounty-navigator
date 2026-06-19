import { Globe, Plus, ExternalLink, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const assets = [
  { host: "api.target.com", type: "API", ports: [443, 8443], severity: "high", tech: ["Node.js", "Nginx"], status: "exposed" },
  { host: "admin.target.com", type: "Web App", ports: [443], severity: "critical", tech: ["React", "Cloudflare"], status: "exposed" },
  { host: "mail.target.com", type: "SMTP", ports: [25, 587, 465], severity: "medium", tech: ["Postfix"], status: "monitored" },
  { host: "cdn.target.com", type: "CDN", ports: [80, 443], severity: "low", tech: ["CloudFront"], status: "secure" },
  { host: "dev.target.com", type: "Web App", ports: [443, 22], severity: "high", tech: ["Express", "PostgreSQL"], status: "exposed" },
  { host: "staging.target.com", type: "Web App", ports: [443], severity: "medium", tech: ["Next.js"], status: "monitored" },
];

const sevColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-primary border-primary/40 bg-primary/10",
  medium: "text-primary/70 border-primary/20 bg-primary/5",
  low: "text-muted-foreground border-border bg-surface-2",
};

export default function AttackSurface() {
  const stats = [
    { label: "Assets", value: assets.length, icon: Globe },
    { label: "Critical", value: assets.filter(a => a.severity === "critical").length, icon: AlertTriangle },
    { label: "Exposed", value: assets.filter(a => a.status === "exposed").length, icon: Shield },
    { label: "Secure", value: assets.filter(a => a.status === "secure").length, icon: CheckCircle2 },
  ];

  return (
    <AppLayout
      title="ATTACK SURFACE"
      subtitle="External asset discovery & monitoring"
      icon={Globe}
      actions={
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Asset
        </button>
      }
    >
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-surface-1 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">DISCOVERED ASSETS</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{assets.length} hosts</span>
          </div>
          <div className="divide-y divide-border">
            {assets.map(a => (
              <div key={a.host} className="px-4 py-3 hover:bg-surface-2 transition-colors flex items-center gap-4">
                <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${sevColor[a.severity]}`}>
                  {a.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-foreground truncate flex items-center gap-2">
                    {a.host}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {a.type} • ports: {a.ports.join(", ")} • {a.tech.join(" / ")}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">{a.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
