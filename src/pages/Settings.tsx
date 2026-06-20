import { Settings as SettingsIcon, Bell, Shield, Palette, Database, Users, Plug, Sliders, Eye } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";

const LS_KEY = "liq.settings";

type SettingsState = Record<string, any>;

const defaults: SettingsState = {
  notifyCritical: true,
  notifySessionEnd: true,
  notifyPersonaAdded: false,
  notifySkillApproved: true,
  autoConfirmExploits: false,
  requireCommanderSignoff: true,
  darkTheme: true,
  reduceMotion: false,
  compactDensity: false,
  sidebarCollapsed: false,
  autoConfirmHigh: false,
  autoRejectLowDays: 30,
  retention: 90,
  defaultLeadPersona: "HYDRA",
  autoSpawnRaiders: true,
  maxRaiders: 5,
  hackeroneToken: "",
  bugcrowdToken: "",
  slackWebhook: "",
};

function useSettings(): [SettingsState, (k: string, v: any) => void] {
  const [s, setS] = useState<SettingsState>(defaults);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setS({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const update = (k: string, v: any) => {
    setS(prev => {
      const next = { ...prev, [k]: v };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [s, update];
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${on ? "bg-primary" : "bg-surface-2 border border-border"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-mono text-xs text-foreground">{label}</div>
        {hint && <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export default function Settings() {
  const [s, set] = useSettings();

  return (
    <AppLayout title="SETTINGS" subtitle="Operator preferences & platform defaults" icon={SettingsIcon}>
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl">

        <Section title="NOTIFICATIONS" icon={Bell}>
          <Row label="Critical finding alerts" hint="Toast when scans surface critical issues">
            <Toggle on={s.notifyCritical} onChange={v => set("notifyCritical", v)} />
          </Row>
          <Row label="Session-end summary" hint="Notify when a session overview is generated">
            <Toggle on={s.notifySessionEnd} onChange={v => set("notifySessionEnd", v)} />
          </Row>
          <Row label="New persona added" hint="Alert when the Commander gains a new persona">
            <Toggle on={s.notifyPersonaAdded} onChange={v => set("notifyPersonaAdded", v)} />
          </Row>
          <Row label="Skill approved" hint="Notify when a queued skill is approved">
            <Toggle on={s.notifySkillApproved} onChange={v => set("notifySkillApproved", v)} />
          </Row>
        </Section>

        <Section title="SECURITY" icon={Shield}>
          <Row label="Auto-confirm exploits" hint="Validate PoCs automatically (use with caution)">
            <Toggle on={s.autoConfirmExploits} onChange={v => set("autoConfirmExploits", v)} />
          </Row>
          <Row label="Require Commander sign-off" hint="Vault items need Commander approval before promotion">
            <Toggle on={s.requireCommanderSignoff} onChange={v => set("requireCommanderSignoff", v)} />
          </Row>
        </Section>

        <Section title="INTERFACE" icon={Palette}>
          <Row label="Dark velvet theme" hint="LiQ.Raid3r default palette">
            <Toggle on={s.darkTheme} onChange={v => set("darkTheme", v)} />
          </Row>
          <Row label="Reduce motion" hint="Disable non-essential animations">
            <Toggle on={s.reduceMotion} onChange={v => set("reduceMotion", v)} />
          </Row>
          <Row label="Compact density" hint="Tighter padding across cards & lists">
            <Toggle on={s.compactDensity} onChange={v => set("compactDensity", v)} />
          </Row>
          <Row label="Sidebar collapsed by default" hint="Start with the left nav collapsed">
            <Toggle on={s.sidebarCollapsed} onChange={v => set("sidebarCollapsed", v)} />
          </Row>
        </Section>

        <Section title="DATA VAULT" icon={Eye}>
          <Row label="Auto-confirm High learnings" hint="Skip manual review for High-severity learnings">
            <Toggle on={s.autoConfirmHigh} onChange={v => set("autoConfirmHigh", v)} />
          </Row>
          <Row label={`Auto-reject Low items after ${s.autoRejectLowDays} days`} hint="Cleans the queue automatically">
            <input type="range" min={7} max={180} value={s.autoRejectLowDays} onChange={e => set("autoRejectLowDays", +e.target.value)} className="accent-primary w-32" />
          </Row>
        </Section>

        <Section title="AGENT DEFAULTS" icon={Users}>
          <Row label="Default Lead persona" hint="Spawn this lead automatically on a new session">
            <select value={s.defaultLeadPersona} onChange={e => set("defaultLeadPersona", e.target.value)} className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono">
              {["PHANTOM", "VIPER", "SPECTER", "HYDRA", "ORACLE", "WRAITH", "GOLEM", "MAGE", "FORGE", "SCRIBE", "WARDEN"].map(n => <option key={n}>{n}</option>)}
            </select>
          </Row>
          <Row label="Auto-spawn Raiders" hint="Leads spawn their own raiders on demand">
            <Toggle on={s.autoSpawnRaiders} onChange={v => set("autoSpawnRaiders", v)} />
          </Row>
          <Row label={`Max concurrent Raiders: ${s.maxRaiders}`} hint="Cap parallel sub-agents per session">
            <input type="range" min={1} max={20} value={s.maxRaiders} onChange={e => set("maxRaiders", +e.target.value)} className="accent-primary w-32" />
          </Row>
        </Section>

        <Section title="DATA RETENTION" icon={Database}>
          <Row label={`Keep scan history for ${s.retention} days`}>
            <input type="range" min={7} max={365} value={s.retention} onChange={e => set("retention", +e.target.value)} className="accent-primary w-32" />
          </Row>
        </Section>

        <Section title="INTEGRATIONS" icon={Plug}>
          <Row label="HackerOne API token" hint="Pulled into Reports for auto-sync (coming soon)">
            <input type="password" value={s.hackeroneToken} onChange={e => set("hackeroneToken", e.target.value)} placeholder="••••" className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono w-40" />
          </Row>
          <Row label="Bugcrowd API token">
            <input type="password" value={s.bugcrowdToken} onChange={e => set("bugcrowdToken", e.target.value)} placeholder="••••" className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono w-40" />
          </Row>
          <Row label="Slack webhook URL" hint="Get critical alerts in your Slack channel">
            <input type="text" value={s.slackWebhook} onChange={e => set("slackWebhook", e.target.value)} placeholder="https://hooks.slack.com/..." className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono w-40" />
          </Row>
        </Section>
      </div>
    </AppLayout>
  );
}
