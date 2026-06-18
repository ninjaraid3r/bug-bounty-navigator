import { useNavigate } from "react-router-dom";
import { Swords, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const RAIDERS = [
  { code: "r-001", name: "R-001", tagline: "Port Scanner Raider", specialty: "Port enumeration" },
  { code: "r-002", name: "R-002", tagline: "Subdomain Enum Raider", specialty: "Subdomain discovery" },
  { code: "r-003", name: "R-003", tagline: "Fuzzer Raider", specialty: "Path / param fuzzing" },
];

export default function Raiders() {
  const nav = useNavigate();
  return (
    <AppLayout title="RAIDERS" subtitle="Sub-agents executing tactical tasks" icon={Swords}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {RAIDERS.map(r => (
          <button key={r.code} onClick={() => nav(`/agents/${r.code}`)}
            className="text-left bg-surface-1 border border-border hover:border-primary/40 hover:bg-surface-2 rounded-lg p-4 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-primary tracking-wider neon-gold">{r.name}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-xs text-foreground mb-1">{r.tagline}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{r.specialty}</div>
          </button>
        ))}
      </div>
    </AppLayout>
  );
}
