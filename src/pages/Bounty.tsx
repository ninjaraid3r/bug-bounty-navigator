import { useMemo, useState } from "react";
import { DollarSign, ExternalLink, Bug, Search, Star, Shield, Filter } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface PayoutTier {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface BountyProgram {
  id: string;
  name: string;
  platform: "HackerOne" | "Bugcrowd" | "Intigriti" | "YesWeHack" | "Self-hosted";
  category: string;
  scope: string[];
  payout: PayoutTier;
  managed: boolean;
  responseTime: string;
  vdpUrl: string;
  reportUrl: string;
  notes?: string;
}

const programs: BountyProgram[] = [
  {
    id: "google",
    name: "Google",
    platform: "Self-hosted",
    category: "Tech Giant",
    scope: ["*.google.com", "*.youtube.com", "Android", "Chrome"],
    payout: { critical: 31337, high: 15000, medium: 5000, low: 500 },
    managed: true, responseTime: "< 2 days",
    vdpUrl: "https://bughunters.google.com/about/rules/google-friends",
    reportUrl: "https://bughunters.google.com/report",
    notes: "VRP since 2010, big bonuses for chains.",
  },
  {
    id: "meta",
    name: "Meta",
    platform: "Self-hosted",
    category: "Social",
    scope: ["facebook.com", "instagram.com", "whatsapp.com", "Oculus"],
    payout: { critical: 50000, high: 15000, medium: 5000, low: 500 },
    managed: true, responseTime: "< 3 days",
    vdpUrl: "https://www.facebook.com/whitehat",
    reportUrl: "https://www.facebook.com/whitehat/report",
  },
  {
    id: "apple",
    name: "Apple",
    platform: "Self-hosted",
    category: "Tech Giant",
    scope: ["iCloud", "iOS", "macOS", "Safari"],
    payout: { critical: 1000000, high: 250000, medium: 100000, low: 5000 },
    managed: true, responseTime: "varies",
    vdpUrl: "https://security.apple.com/bounty/",
    reportUrl: "https://security.apple.com/bounty/submission/",
    notes: "Up to $2M for full chain zero-clicks.",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    platform: "Self-hosted",
    category: "Tech Giant",
    scope: ["Azure", "M365", "Windows", "Edge"],
    payout: { critical: 250000, high: 60000, medium: 20000, low: 500 },
    managed: true, responseTime: "< 5 days",
    vdpUrl: "https://www.microsoft.com/en-us/msrc/bounty",
    reportUrl: "https://msrc.microsoft.com/report/",
  },
  {
    id: "github",
    name: "GitHub",
    platform: "HackerOne",
    category: "DevTools",
    scope: ["github.com", "*.github.com", "GitHub Actions"],
    payout: { critical: 30000, high: 10000, medium: 4000, low: 617 },
    managed: true, responseTime: "< 1 day",
    vdpUrl: "https://hackerone.com/github",
    reportUrl: "https://hackerone.com/github/reports/new",
  },
  {
    id: "shopify",
    name: "Shopify",
    platform: "HackerOne",
    category: "E-commerce",
    scope: ["*.shopify.com", "Shopify mobile apps"],
    payout: { critical: 50000, high: 15000, medium: 4000, low: 500 },
    managed: true, responseTime: "< 2 days",
    vdpUrl: "https://hackerone.com/shopify",
    reportUrl: "https://hackerone.com/shopify/reports/new",
  },
  {
    id: "uber",
    name: "Uber",
    platform: "HackerOne",
    category: "Mobility",
    scope: ["uber.com", "*.uber.com", "Uber Eats", "Mobile apps"],
    payout: { critical: 20000, high: 8000, medium: 1500, low: 500 },
    managed: true, responseTime: "< 4 days",
    vdpUrl: "https://hackerone.com/uber",
    reportUrl: "https://hackerone.com/uber/reports/new",
  },
  {
    id: "paypal",
    name: "PayPal",
    platform: "HackerOne",
    category: "Fintech",
    scope: ["paypal.com", "venmo.com", "*.paypal.com"],
    payout: { critical: 30000, high: 12500, medium: 2500, low: 250 },
    managed: true, responseTime: "< 3 days",
    vdpUrl: "https://hackerone.com/paypal",
    reportUrl: "https://hackerone.com/paypal/reports/new",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    platform: "HackerOne",
    category: "Crypto",
    scope: ["coinbase.com", "*.coinbase.com", "Coinbase Wallet"],
    payout: { critical: 50000, high: 15000, medium: 5000, low: 200 },
    managed: true, responseTime: "< 2 days",
    vdpUrl: "https://hackerone.com/coinbase",
    reportUrl: "https://hackerone.com/coinbase/reports/new",
  },
  {
    id: "binance",
    name: "Binance",
    platform: "HackerOne",
    category: "Crypto",
    scope: ["binance.com", "*.binance.com", "Binance Smart Chain"],
    payout: { critical: 100000, high: 18000, medium: 4000, low: 100 },
    managed: true, responseTime: "< 5 days",
    vdpUrl: "https://hackerone.com/binance",
    reportUrl: "https://hackerone.com/binance/reports/new",
  },
  {
    id: "tesla",
    name: "Tesla",
    platform: "Bugcrowd",
    category: "Automotive",
    scope: ["tesla.com", "Vehicle infotainment", "Energy products"],
    payout: { critical: 15000, high: 5000, medium: 1000, low: 100 },
    managed: false, responseTime: "varies",
    vdpUrl: "https://bugcrowd.com/tesla",
    reportUrl: "https://bugcrowd.com/tesla/report",
    notes: "Vehicle pwn = up to $250k in special events.",
  },
  {
    id: "atlassian",
    name: "Atlassian",
    platform: "Bugcrowd",
    category: "DevTools",
    scope: ["atlassian.com", "Jira Cloud", "Confluence Cloud", "Bitbucket"],
    payout: { critical: 15000, high: 6000, medium: 2400, low: 300 },
    managed: true, responseTime: "< 3 days",
    vdpUrl: "https://bugcrowd.com/atlassian",
    reportUrl: "https://bugcrowd.com/atlassian/report",
  },
  {
    id: "tiktok",
    name: "TikTok",
    platform: "HackerOne",
    category: "Social",
    scope: ["tiktok.com", "*.tiktok.com", "Mobile apps"],
    payout: { critical: 15000, high: 6900, medium: 1500, low: 250 },
    managed: true, responseTime: "< 4 days",
    vdpUrl: "https://hackerone.com/tiktok",
    reportUrl: "https://hackerone.com/tiktok/reports/new",
  },
  {
    id: "reddit",
    name: "Reddit",
    platform: "HackerOne",
    category: "Social",
    scope: ["reddit.com", "*.reddit.com", "Mobile apps"],
    payout: { critical: 10000, high: 5000, medium: 1000, low: 100 },
    managed: true, responseTime: "< 5 days",
    vdpUrl: "https://hackerone.com/reddit",
    reportUrl: "https://hackerone.com/reddit/reports/new",
  },
  {
    id: "spotify",
    name: "Spotify",
    platform: "HackerOne",
    category: "Media",
    scope: ["spotify.com", "*.spotify.com", "Mobile apps"],
    payout: { critical: 12000, high: 4000, medium: 800, low: 100 },
    managed: false, responseTime: "< 7 days",
    vdpUrl: "https://hackerone.com/spotify",
    reportUrl: "https://hackerone.com/spotify/reports/new",
  },
  {
    id: "intigriti-ovh",
    name: "OVHcloud",
    platform: "Intigriti",
    category: "Cloud",
    scope: ["ovhcloud.com", "Customer panel", "OVH API"],
    payout: { critical: 10000, high: 3000, medium: 750, low: 100 },
    managed: true, responseTime: "< 5 days",
    vdpUrl: "https://www.intigriti.com/programs/ovh/ovh/detail",
    reportUrl: "https://app.intigriti.com/researcher/programs/ovh/ovh/detail",
  },
];

const categories = ["All", ...Array.from(new Set(programs.map(p => p.category)))];
const platforms = ["All", "HackerOne", "Bugcrowd", "Intigriti", "YesWeHack", "Self-hosted"];

const platformColor: Record<string, string> = {
  HackerOne: "text-primary border-primary/40 bg-primary/10",
  Bugcrowd: "text-primary/80 border-primary/30 bg-primary/5",
  Intigriti: "text-primary/80 border-primary/30 bg-primary/5",
  YesWeHack: "text-primary/80 border-primary/30 bg-primary/5",
  "Self-hosted": "text-foreground border-border bg-surface-2",
};

export default function Bounty() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [plat, setPlat] = useState("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return programs.filter(p =>
      (cat === "All" || p.category === cat) &&
      (plat === "All" || p.platform === plat) &&
      (!q || p.name.toLowerCase().includes(q) || p.scope.some(s => s.toLowerCase().includes(q)))
    );
  }, [search, cat, plat]);

  const topPayout = Math.max(...filtered.map(p => p.payout.critical), 0);

  return (
    <AppLayout
      title="BOUNTY"
      subtitle="Active bug bounty programs & payout intel"
      icon={DollarSign}
      actions={
        <span className="text-[10px] font-mono text-primary px-2 py-1 rounded border border-primary/30 bg-primary/10">
          TOP CRIT: ${topPayout.toLocaleString()}
        </span>
      }
    >
      <div className="p-5 space-y-4">
        {/* Filters */}
        <div className="bg-surface-1 border border-border rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-2 bg-surface-2 rounded-md border border-border focus-within:border-primary/30">
            <Search className="w-3.5 h-3.5 text-muted-foreground ml-3" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by program or scope (e.g. binance, *.uber.com)..."
              className="flex-1 bg-transparent px-2 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <FilterRow label="Platform" icon={Filter} options={platforms} value={plat} onChange={setPlat} />
            <FilterRow label="Category" icon={Filter} options={categories} value={cat} onChange={setCat} />
          </div>
        </div>

        {/* Programs grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(p => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-mono text-muted-foreground">No programs match your filters.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function FilterRow({ label, icon: Icon, options, value, onChange }: {
  label: string; icon: any; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-[10px] font-mono text-muted-foreground uppercase mr-1">{label}:</span>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
            value === o
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-surface-2 text-muted-foreground border-border hover:text-primary hover:border-primary/20"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ProgramCard({ program }: { program: BountyProgram }) {
  const tiers: { label: string; key: keyof PayoutTier; color: string }[] = [
    { label: "Critical", key: "critical", color: "text-destructive border-destructive/40 bg-destructive/10" },
    { label: "High",     key: "high",     color: "text-primary border-primary/40 bg-primary/10" },
    { label: "Medium",   key: "medium",   color: "text-primary/70 border-primary/20 bg-primary/5" },
    { label: "Low",      key: "low",      color: "text-muted-foreground border-border bg-surface-2" },
  ];

  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/30 transition-all space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mono text-sm font-bold text-foreground">{program.name}</h3>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${platformColor[program.platform]}`}>
              {program.platform.toUpperCase()}
            </span>
            {program.managed && (
              <span className="text-[9px] font-mono text-primary flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-primary" /> MANAGED
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {program.category} • Avg response {program.responseTime}
          </p>
        </div>
      </div>

      {/* Scope */}
      <div className="bg-surface-2/50 rounded-md px-2.5 py-2 border border-border">
        <div className="flex items-center gap-1 mb-1">
          <Shield className="w-2.5 h-2.5 text-primary" />
          <span className="text-[9px] font-mono font-bold text-primary uppercase">In Scope</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {program.scope.map(s => (
            <code key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background text-foreground/80 border border-border">
              {s}
            </code>
          ))}
        </div>
      </div>

      {/* Payout tiers */}
      <div>
        <div className="text-[9px] font-mono font-bold text-primary uppercase mb-1.5">Payout per Severity</div>
        <div className="grid grid-cols-4 gap-1.5">
          {tiers.map(t => (
            <div key={t.key} className={`rounded border px-2 py-1.5 text-center ${t.color}`}>
              <div className="text-[8px] font-mono uppercase opacity-80">{t.label}</div>
              <div className="text-xs font-mono font-bold mt-0.5">
                ${program.payout[t.key].toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {program.notes && (
        <p className="text-[10px] font-mono text-muted-foreground italic">★ {program.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <a
          href={program.vdpUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-surface-2 hover:bg-surface-2/70 text-foreground text-[11px] font-mono font-bold transition-colors border border-border"
        >
          <ExternalLink className="w-3 h-3" /> VIEW PROGRAM
        </a>
        <a
          href={program.reportUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-[11px] font-mono font-bold hover:bg-primary/90 transition-colors"
        >
          <Bug className="w-3 h-3" /> REPORT BUG
        </a>
      </div>
    </div>
  );
}
