import { FileSearch, Download, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const reports = [
  { id: "RPT-2024-014", title: "SQLi in /api/search → RCE", target: "target.com", severity: "critical", payout: 12500, status: "paid", date: "2024-12-15" },
  { id: "RPT-2024-013", title: "IDOR exposing PII", target: "acme-corp.io", severity: "high", payout: 4500, status: "triaged", date: "2024-12-10" },
  { id: "RPT-2024-012", title: "SSRF → AWS metadata exfil", target: "fintech.app", severity: "critical", payout: 18000, status: "paid", date: "2024-12-02" },
  { id: "RPT-2024-011", title: "JWT none-alg auth bypass", target: "target.com", severity: "high", payout: 6000, status: "paid", date: "2024-11-22" },
  { id: "RPT-2024-010", title: "Stored XSS in admin panel", target: "old-saas.com", severity: "medium", payout: 800, status: "paid", date: "2024-11-08" },
];

const sevColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-primary border-primary/40 bg-primary/10",
  medium: "text-primary/70 border-primary/20 bg-primary/5",
};

export default function Reports() {
  const total = reports.reduce((s, r) => s + r.payout, 0);

  return (
    <AppLayout
      title="REPORTS"
      subtitle="Submitted vulnerability reports & payouts"
      icon={FileSearch}
      actions={
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Report
        </button>
      }
    >
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Total Earned</div>
            <div className="text-2xl font-mono font-bold text-primary neon-gold">${total.toLocaleString()}</div>
          </div>
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Submitted</div>
            <div className="text-2xl font-mono font-bold text-foreground">{reports.length}</div>
          </div>
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Paid</div>
            <div className="text-2xl font-mono font-bold text-foreground">{reports.filter(r => r.status === "paid").length}</div>
          </div>
          <div className="bg-surface-1 border border-border rounded-lg p-4">
            <div className="text-[10px] font-mono text-muted-foreground uppercase">Critical</div>
            <div className="text-2xl font-mono font-bold text-foreground">{reports.filter(r => r.severity === "critical").length}</div>
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">SUBMISSION LOG</h2>
          </div>
          <div className="divide-y divide-border">
            {reports.map(r => (
              <div key={r.id} className="px-4 py-3 hover:bg-surface-2 transition-colors flex items-center gap-4">
                <span className="font-mono text-[10px] text-muted-foreground w-24">{r.id}</span>
                <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${sevColor[r.severity]}`}>
                  {r.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-foreground truncate">{r.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{r.target} • {r.date}</div>
                </div>
                <span className="font-mono text-xs font-bold text-primary">${r.payout.toLocaleString()}</span>
                <button className="p-1.5 rounded hover:bg-primary/10 text-primary">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
