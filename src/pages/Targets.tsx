import { Crosshair, Plus, DollarSign, Calendar } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const targets = [
  { name: "target.com", program: "HackerOne", scope: "*.target.com, mobile apps", payout: "$50 - $25k", status: "active", since: "2024-08-12" },
  { name: "acme-corp.io", program: "Bugcrowd", scope: "api.acme-corp.io, web", payout: "$100 - $15k", status: "active", since: "2024-09-03" },
  { name: "fintech.app", program: "Private", scope: "*.fintech.app excluding /staging", payout: "$500 - $50k", status: "active", since: "2024-10-21" },
  { name: "old-saas.com", program: "Intigriti", scope: "main domain only", payout: "$50 - $5k", status: "paused", since: "2024-06-04" },
];

export default function Targets() {
  return (
    <AppLayout
      title="TARGETS"
      subtitle="Bug bounty programs in scope"
      icon={Crosshair}
      actions={
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Target
        </button>
      }
    >
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {targets.map(t => (
          <div key={t.name} className="bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-foreground">{t.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">via {t.program}</p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                t.status === "active" ? "text-primary border-primary/40 bg-primary/10" : "text-muted-foreground border-border bg-surface-2"
              }`}>{t.status.toUpperCase()}</span>
            </div>
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="text-[10px] font-mono text-muted-foreground">SCOPE: <span className="text-foreground">{t.scope}</span></div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-primary" />{t.payout}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.since}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
