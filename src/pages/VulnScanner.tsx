import { Bug, Play, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useState } from "react";

const findings = [
  { id: "VULN-001", title: "SQL Injection in /api/search", severity: "critical", cvss: 9.8, host: "api.target.com", status: "open" },
  { id: "VULN-002", title: "Reflected XSS in error page", severity: "high", cvss: 7.4, host: "admin.target.com", status: "open" },
  { id: "VULN-003", title: "Outdated jQuery 1.8 (CVE-2020-11023)", severity: "medium", cvss: 6.1, host: "target.com", status: "open" },
  { id: "VULN-004", title: "Missing HSTS header", severity: "low", cvss: 3.1, host: "cdn.target.com", status: "triaged" },
  { id: "VULN-005", title: "S3 bucket directory listing", severity: "high", cvss: 7.5, host: "files.target.com", status: "open" },
  { id: "VULN-006", title: "GraphQL introspection enabled", severity: "medium", cvss: 5.3, host: "api.target.com", status: "open" },
];

const sevColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-primary border-primary/40 bg-primary/10",
  medium: "text-primary/70 border-primary/20 bg-primary/5",
  low: "text-muted-foreground border-border bg-surface-2",
};

export default function VulnScanner() {
  const [scanning, setScanning] = useState(false);

  return (
    <AppLayout
      title="VULN SCANNER"
      subtitle="Automated vulnerability discovery & triage"
      icon={Bug}
      actions={
        <button
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 2500); }}
          disabled={scanning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {scanning ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {scanning ? "SCANNING…" : "RUN SCAN"}
        </button>
      }
    >
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Critical", value: findings.filter(f => f.severity === "critical").length, icon: AlertTriangle },
            { label: "High", value: findings.filter(f => f.severity === "high").length, icon: Bug },
            { label: "Medium", value: findings.filter(f => f.severity === "medium").length, icon: Bug },
            { label: "Resolved", value: 12, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
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
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">FINDINGS</h2>
          </div>
          <div className="divide-y divide-border">
            {findings.map(f => (
              <div key={f.id} className="px-4 py-3 hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-20">{f.id}</span>
                  <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${sevColor[f.severity]}`}>
                    {f.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-foreground truncate">{f.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{f.host} • CVSS {f.cvss}</div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{f.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
