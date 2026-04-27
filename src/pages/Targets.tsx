import { useEffect, useMemo, useState } from "react";
import {
  Crosshair, Plus, DollarSign, Calendar, ArrowLeft, ExternalLink, Bug,
  Shield, AlertTriangle, CheckCircle2, XCircle, FileText, Activity, TrendingUp,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TargetMeta = {
  name: string;
  program: string;
  programUrl: string;
  reportUrl: string;
  scope: string;
  outOfScope: string;
  payout: string;
  payoutTiers: { severity: string; range: string }[];
  status: "active" | "paused";
  since: string;
  rules: string[];
  pros: string[];
  cons: string[];
  responseSLA: string;
};

const TARGETS: TargetMeta[] = [
  {
    name: "target.com",
    program: "HackerOne",
    programUrl: "https://hackerone.com/target",
    reportUrl: "https://hackerone.com/target/reports/new",
    scope: "*.target.com, mobile apps (iOS & Android)",
    outOfScope: "third-party services, social engineering, DoS",
    payout: "$50 - $25,000",
    payoutTiers: [
      { severity: "Critical", range: "$10,000 - $25,000" },
      { severity: "High", range: "$2,500 - $10,000" },
      { severity: "Medium", range: "$500 - $2,500" },
      { severity: "Low", range: "$50 - $500" },
    ],
    status: "active",
    since: "2024-08-12",
    rules: [
      "Only test assets explicitly listed in scope",
      "No automated scanners against production endpoints",
      "Report within 24h of discovery for critical issues",
      "PII must be redacted in PoCs",
    ],
    pros: [
      "Fast triage (avg 2 days)",
      "Generous critical payouts",
      "Wide scope including mobile",
      "Bonuses for chained vulns",
    ],
    cons: [
      "Heavy duplicate rate on common XSS",
      "Strict on out-of-scope reports",
      "Mobile testing requires signed builds",
    ],
    responseSLA: "First response: 48h",
  },
  {
    name: "acme-corp.io",
    program: "Bugcrowd",
    programUrl: "https://bugcrowd.com/acme",
    reportUrl: "https://bugcrowd.com/acme/report",
    scope: "api.acme-corp.io, web app",
    outOfScope: "marketing site, blog.acme-corp.io",
    payout: "$100 - $15,000",
    payoutTiers: [
      { severity: "Critical", range: "$5,000 - $15,000" },
      { severity: "High", range: "$1,500 - $5,000" },
      { severity: "Medium", range: "$300 - $1,500" },
      { severity: "Low", range: "$100 - $300" },
    ],
    status: "active",
    since: "2024-09-03",
    rules: [
      "Use VPN provided by program for API testing",
      "No social engineering of employees",
      "Rate-limit your scanners to 5 req/s",
    ],
    pros: ["Active program managers", "Weekly bonuses for repeat researchers"],
    cons: ["Slow payout (30+ days)", "Strict scope enforcement"],
    responseSLA: "First response: 72h",
  },
  {
    name: "fintech.app",
    program: "Private",
    programUrl: "#",
    reportUrl: "mailto:security@fintech.app",
    scope: "*.fintech.app excluding /staging",
    outOfScope: "/staging, /qa, third-party SaaS",
    payout: "$500 - $50,000",
    payoutTiers: [
      { severity: "Critical", range: "$20,000 - $50,000" },
      { severity: "High", range: "$5,000 - $20,000" },
      { severity: "Medium", range: "$1,000 - $5,000" },
      { severity: "Low", range: "$500 - $1,000" },
    ],
    status: "active",
    since: "2024-10-21",
    rules: [
      "NDA required — do not disclose findings publicly",
      "Test only with provided sandbox accounts",
      "Report financial impact estimates with each finding",
    ],
    pros: ["Highest payouts on this list", "Direct security team contact", "Low duplicate rate"],
    cons: ["NDA restricts public CVs", "Manual triage can take 5-7 days"],
    responseSLA: "First response: 24h",
  },
  {
    name: "old-saas.com",
    program: "Intigriti",
    programUrl: "https://intigriti.com/programs/old-saas",
    reportUrl: "https://intigriti.com/programs/old-saas/report",
    scope: "main domain only",
    outOfScope: "subdomains, APIs, mobile",
    payout: "$50 - $5,000",
    payoutTiers: [
      { severity: "Critical", range: "$2,000 - $5,000" },
      { severity: "High", range: "$500 - $2,000" },
      { severity: "Medium", range: "$150 - $500" },
      { severity: "Low", range: "$50 - $150" },
    ],
    status: "paused",
    since: "2024-06-04",
    rules: ["Only main domain", "No automated tools"],
    pros: ["Simple scope", "Easy first reports"],
    cons: ["Low payouts", "Slow triage", "Currently paused"],
    responseSLA: "First response: 7 days",
  },
];

interface TargetStats {
  total: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
  bySeverity: Record<string, number>;
  totalRewards: number;
  recentFindings: any[];
  recentTasks: any[];
}

function emptyStats(): TargetStats {
  return { total: 0, week: 0, month: 0, quarter: 0, year: 0, bySeverity: {}, totalRewards: 0, recentFindings: [], recentTasks: [] };
}

export default function Targets() {
  const [selected, setSelected] = useState<TargetMeta | null>(null);

  return (
    <AppLayout
      title="TARGETS"
      subtitle="Bug bounty programs in scope"
      icon={Crosshair}
      actions={
        selected ? (
          <Button size="sm" variant="outline" onClick={() => setSelected(null)} className="font-mono text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> All Targets
          </Button>
        ) : (
          <Button size="sm" className="font-mono text-xs font-bold">
            <Plus className="w-3.5 h-3.5" /> New Target
          </Button>
        )
      }
    >
      {selected ? (
        <TargetDetail target={selected} />
      ) : (
        <TargetGrid onSelect={setSelected} />
      )}
    </AppLayout>
  );
}

function TargetGrid({ onSelect }: { onSelect: (t: TargetMeta) => void }) {
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      {TARGETS.map((t) => (
        <button
          key={t.name}
          onClick={() => onSelect(t)}
          className="text-left bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-glow transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground">{t.name}</h3>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">via {t.program}</p>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                t.status === "active"
                  ? "text-primary border-primary/40 bg-primary/10"
                  : "text-muted-foreground border-border bg-surface-2"
              }`}
            >
              {t.status.toUpperCase()}
            </span>
          </div>
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="text-[10px] font-mono text-muted-foreground">
              SCOPE: <span className="text-foreground">{t.scope}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-primary" />
                {t.payout}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t.since}
              </span>
            </div>
            <div className="text-[10px] font-mono text-primary mt-2">View details →</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function TargetDetail({ target }: { target: TargetMeta }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<TargetStats>(emptyStats());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, target.name]);

  async function loadStats() {
    setLoading(true);
    // Find missions for this target
    const { data: missions } = await supabase
      .from("missions")
      .select("id")
      .eq("user_id", user!.id)
      .eq("target", target.name);

    const missionIds = (missions || []).map((m) => m.id);

    if (missionIds.length === 0) {
      setStats(emptyStats());
      setLoading(false);
      return;
    }

    const [{ data: findings }, { data: tasks }] = await Promise.all([
      supabase
        .from("findings")
        .select("*")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("agent_tasks")
        .select("*")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const now = Date.now();
    const wk = 7 * 86400_000;
    const mo = 30 * 86400_000;
    const qt = 90 * 86400_000;
    const yr = 365 * 86400_000;

    const s = emptyStats();
    s.recentFindings = (findings || []).slice(0, 10);
    s.recentTasks = tasks || [];
    s.total = findings?.length || 0;

    (findings || []).forEach((f: any) => {
      const ts = new Date(f.created_at).getTime();
      const age = now - ts;
      if (age < wk) s.week++;
      if (age < mo) s.month++;
      if (age < qt) s.quarter++;
      if (age < yr) s.year++;
      s.bySeverity[f.severity] = (s.bySeverity[f.severity] || 0) + 1;
      if (f.reward_amount) s.totalRewards += Number(f.reward_amount);
    });

    setStats(s);
    setLoading(false);
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <Card className="p-5 bg-surface-1 border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-2xl font-bold text-foreground">{target.name}</h2>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              via {target.program} · since {target.since}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild className="font-mono text-xs">
              <a href={target.programUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> Program Page
              </a>
            </Button>
            <Button size="sm" asChild className="font-mono text-xs font-bold">
              <a href={target.reportUrl} target="_blank" rel="noreferrer">
                <Bug className="w-3.5 h-3.5" /> Report a Bug
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="THIS WEEK" value={stats.week} icon={Activity} />
        <StatCard label="THIS MONTH" value={stats.month} icon={TrendingUp} />
        <StatCard label="QUARTER" value={stats.quarter} icon={Calendar} />
        <StatCard label="THIS YEAR" value={stats.year} icon={Bug} />
        <StatCard label="REWARDS" value={`$${stats.totalRewards.toLocaleString()}`} icon={DollarSign} accent />
      </div>

      <Tabs defaultValue="program" className="w-full">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="program">Program Info</TabsTrigger>
          <TabsTrigger value="payouts">Payout Tiers</TabsTrigger>
          <TabsTrigger value="proscons">Pros / Cons</TabsTrigger>
          <TabsTrigger value="findings">Latest Bugs ({stats.total})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="program" className="mt-4 space-y-3">
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-primary mb-2">SCOPE</h4>
            <p className="font-mono text-xs text-foreground">{target.scope}</p>
          </Card>
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-destructive mb-2">OUT OF SCOPE</h4>
            <p className="font-mono text-xs text-foreground">{target.outOfScope}</p>
          </Card>
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-primary mb-2">RULES</h4>
            <ul className="space-y-1.5">
              {target.rules.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs font-mono text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-primary mb-2">RESPONSE SLA</h4>
            <p className="font-mono text-xs text-foreground">{target.responseSLA}</p>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card className="bg-surface-1 border-border overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-border">
              <div className="bg-surface-2 p-3 font-mono text-[10px] font-bold text-muted-foreground">SEVERITY</div>
              <div className="bg-surface-2 p-3 font-mono text-[10px] font-bold text-muted-foreground">PAYOUT RANGE</div>
              {target.payoutTiers.map((tier) => (
                <SeverityRow key={tier.severity} severity={tier.severity} range={tier.range} />
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="proscons" className="mt-4 grid md:grid-cols-2 gap-3">
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-primary mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> PROS
            </h4>
            <ul className="space-y-2">
              {target.pros.map((p, i) => (
                <li key={i} className="text-xs font-mono text-foreground flex gap-2">
                  <span className="text-primary">+</span>
                  {p}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4 bg-surface-1 border-border">
            <h4 className="font-mono text-xs font-bold text-destructive mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> CONS
            </h4>
            <ul className="space-y-2">
              {target.cons.map((c, i) => (
                <li key={i} className="text-xs font-mono text-foreground flex gap-2">
                  <span className="text-destructive">−</span>
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="mt-4 space-y-2">
          {loading ? (
            <p className="font-mono text-xs text-muted-foreground">Loading...</p>
          ) : stats.recentFindings.length === 0 ? (
            <Card className="p-6 bg-surface-1 border-border text-center">
              <Bug className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                No findings logged yet for this target. Run a mission to start populating.
              </p>
            </Card>
          ) : (
            stats.recentFindings.map((f) => (
              <Card key={f.id} className="p-3 bg-surface-1 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge sev={f.severity} />
                      <span className="font-mono text-xs font-bold text-foreground truncate">{f.title}</span>
                    </div>
                    {f.affected_url && (
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{f.affected_url}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {f.reward_amount && (
                      <div className="font-mono text-xs font-bold text-primary">${Number(f.reward_amount).toLocaleString()}</div>
                    )}
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-2">
          {loading ? (
            <p className="font-mono text-xs text-muted-foreground">Loading...</p>
          ) : stats.recentTasks.length === 0 ? (
            <Card className="p-6 bg-surface-1 border-border text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                No agent activity recorded for this target yet.
              </p>
            </Card>
          ) : (
            stats.recentTasks.map((t) => (
              <Card key={t.id} className="p-3 bg-surface-1 border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {t.agent_codename}
                      </Badge>
                      <span className="font-mono text-xs text-foreground truncate">{t.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.grade && (
                      <span
                        className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                          t.grade === "A"
                            ? "text-primary bg-primary/10"
                            : t.grade === "F"
                              ? "text-destructive bg-destructive/10"
                              : "text-foreground bg-surface-2"
                        }`}
                      >
                        {t.grade}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: boolean }) {
  return (
    <Card className={`p-3 bg-surface-1 border-border ${accent ? "border-primary/40" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[9px] text-muted-foreground">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`font-mono text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}

function SeverityRow({ severity, range }: { severity: string; range: string }) {
  return (
    <>
      <div className="bg-surface-1 p-3 font-mono text-xs">
        <SeverityBadge sev={severity.toLowerCase()} />
      </div>
      <div className="bg-surface-1 p-3 font-mono text-xs text-foreground font-bold">{range}</div>
    </>
  );
}

function SeverityBadge({ sev }: { sev: string }) {
  const s = (sev || "info").toLowerCase();
  const cls =
    s === "critical"
      ? "text-destructive border-destructive/50 bg-destructive/10"
      : s === "high"
        ? "text-orange-400 border-orange-500/50 bg-orange-500/10"
        : s === "medium"
          ? "text-primary border-primary/50 bg-primary/10"
          : s === "low"
            ? "text-blue-400 border-blue-500/50 bg-blue-500/10"
            : "text-muted-foreground border-border bg-surface-2";
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${cls}`}>
      {s}
    </span>
  );
}
