import { useNavigate } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const LEADS = [
  { code: "phantom", name: "PHANTOM", tagline: "Recon Lead — OSINT, DNS, scanning", specialty: "Discovery · Surface mapping" },
  { code: "viper", name: "VIPER", tagline: "Exploit Lead — vulns, payloads, attacks", specialty: "Exploitation · PoC crafting" },
  { code: "specter", name: "SPECTER", tagline: "Stealth Lead — evasion, persistence", specialty: "Evasion · OPSEC · Persistence" },
  { code: "cartographer", name: "CARTOGRAPHER", tagline: "Recon Mapping Lead — attack surface", specialty: "Subdomains · Endpoints · Mind-mapping" },
];

export default function Leads() {
  const nav = useNavigate();
  return (
    <AppLayout title="LEADS" subtitle="Specialist agents that orchestrate Raiders" icon={Users}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEADS.map(l => (
          <button key={l.code} onClick={() => nav(`/agents/${l.code}`)}
            className="text-left bg-surface-1 border border-border hover:border-primary/40 hover:bg-surface-2 rounded-lg p-4 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-primary tracking-wider neon-gold">{l.name}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-xs text-foreground mb-1">{l.tagline}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{l.specialty}</div>
          </button>
        ))}
      </div>
    </AppLayout>
  );
}
