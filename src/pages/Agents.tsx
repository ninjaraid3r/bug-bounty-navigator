import { Users, Crosshair, Swords, Activity, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TierCard {
  tier: "commander" | "leads" | "raiders";
  title: string;
  tagline: string;
  icon: typeof Crosshair;
  members: string[];
}

const TIERS: TierCard[] = [
  { tier: "commander", title: "COMMANDER", tagline: "Strategic orchestrator · memory · grading", icon: Crosshair, members: ["COMMANDER"] },
  { tier: "leads", title: "LEADS", tagline: "Specialist division heads", icon: Swords, members: ["PHANTOM", "VIPER", "SPECTER", "CARTOGRAPHER"] },
  { tier: "raiders", title: "RAIDERS", tagline: "Tactical sub-agents executing focused tasks", icon: Activity, members: ["R-001", "R-002", "R-003"] },
];

interface KnowledgeCounts {
  learnings: number;
  memory: number;
  opinions: number;
  recs: number;
}

export default function Agents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, KnowledgeCounts>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [l, m, o, r] = await Promise.all([
        supabase.from("agent_learnings").select("agent_codename").eq("user_id", user.id),
        supabase.from("agent_memory").select("agent_codename").eq("user_id", user.id),
        supabase.from("agent_opinions").select("agent_codename").eq("user_id", user.id),
        supabase.from("agent_recommendations").select("agent_codename").eq("user_id", user.id),
      ]);
      const map: Record<string, KnowledgeCounts> = {};
      const bump = (code: string, k: keyof KnowledgeCounts) => {
        const key = code.toUpperCase();
        map[key] = map[key] || { learnings: 0, memory: 0, opinions: 0, recs: 0 };
        map[key][k]++;
      };
      l.data?.forEach((row: any) => bump(row.agent_codename, "learnings"));
      m.data?.forEach((row: any) => bump(row.agent_codename, "memory"));
      o.data?.forEach((row: any) => bump(row.agent_codename, "opinions"));
      r.data?.forEach((row: any) => bump(row.agent_codename, "recs"));
      setCounts(map);
    })();
  }, [user]);

  const tierTotal = (tier: TierCard): KnowledgeCounts =>
    tier.members.reduce(
      (acc, m) => {
        const c = counts[m] || { learnings: 0, memory: 0, opinions: 0, recs: 0 };
        acc.learnings += c.learnings;
        acc.memory += c.memory;
        acc.opinions += c.opinions;
        acc.recs += c.recs;
        return acc;
      },
      { learnings: 0, memory: 0, opinions: 0, recs: 0 }
    );

  return (
    <AppLayout title="AGENTS" subtitle="Roster · knowledge · recommendations" icon={Users}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const total = tierTotal(t);
            return (
              <button
                key={t.tier}
                onClick={() => navigate(`/agents/tier/${t.tier}`)}
                className="text-left group relative overflow-hidden rounded-xl border border-border bg-surface-1 hover:border-primary/60 hover:neon-gold-box transition-all p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center neon-gold-box">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-mono text-lg font-bold text-foreground tracking-wider mb-1">{t.title}</h3>
                <p className="text-xs font-mono text-muted-foreground mb-4">{t.tagline}</p>
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                  <Stat label="Learn" value={total.learnings} />
                  <Stat label="Memory" value={total.memory} />
                  <Stat label="Opinions" value={total.opinions} />
                  <Stat label="Recs" value={total.recs} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.members.map((m) => (
                    <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground/70">
                      {m}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-surface-1 p-5">
          <h2 className="font-mono text-sm font-bold text-primary tracking-wider mb-2">KNOWLEDGE BASE</h2>
          <p className="text-xs font-mono text-muted-foreground">
            Each agent contributes High/Medium/Low Learnings, Session Memory Summaries, and Opinions from
            their specialty. They can also recommend new <span className="text-primary">workflows</span>,{" "}
            <span className="text-primary">automations</span>, and{" "}
            <span className="text-primary">skill.md</span> files to be promoted into the Skills tab.
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-2">
            Trigger an End-of-Session Overview from the <span className="text-primary">Recon</span> tab to
            populate this knowledge after each session.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="font-mono text-base font-bold text-primary">{value}</div>
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
