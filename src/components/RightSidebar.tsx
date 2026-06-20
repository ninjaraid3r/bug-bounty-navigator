import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Swords,
  Activity,
  FileText,
  Plus,
  X,
  Check,
  Power,
  UserCog,
} from "lucide-react";
import PersonasDialog from "./PersonasDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Agent {
  name: string;
  role: string;
  status: "active" | "idle" | "working";
  type: "manager" | "lead" | "raider";
  prompt?: string;
}

const baseAgents: Agent[] = [
  { name: "COMMANDER", role: "Manager Agent", status: "active", type: "manager" },
  { name: "PHANTOM", role: "Recon Lead", status: "working", type: "lead" },
  { name: "VIPER", role: "Exploit Lead", status: "active", type: "lead" },
  { name: "SPECTER", role: "Stealth Lead", status: "idle", type: "lead" },
  { name: "CARTOGRAPHER", role: "Recon Mapping Lead", status: "active", type: "lead" },
];

const raiders: Agent[] = [
  { name: "R-001", role: "Port Scanner", status: "working", type: "raider" },
  { name: "R-002", role: "Subdomain Enum", status: "working", type: "raider" },
  { name: "R-003", role: "Fuzzer", status: "idle", type: "raider" },
];

// Specialty Lead templates the user can pull into a session
const LEAD_TEMPLATES: { codename: string; role: string; specialty: string; prompt: string }[] = [
  {
    codename: "ORACLE",
    role: "OSINT Lead",
    specialty: "Open-source intel, breach dumps, dorking, social mapping",
    prompt:
      "You are Oracle — Lead of OSINT. You specialize in passive intelligence: Google dorks, GitHub leaks, breach dumps (HIBP, DeHashed), Shodan/Censys, social graph mapping (Maltego, Sherlock). Return actionable intel with sources, queries, and confidence ratings.",
  },
  {
    codename: "HYDRA",
    role: "Web App Lead",
    specialty: "BurpSuite, IDOR, SSRF, auth flaws, business logic",
    prompt:
      "You are Hydra — Lead of Web Application attacks. You specialize in BurpSuite workflows, IDOR/BOLA chains, SSRF, auth bypass, JWT abuse, and business logic flaws. Provide concrete repro steps with HTTP requests in code blocks.",
  },
  {
    codename: "WRAITH",
    role: "API Lead",
    specialty: "REST/GraphQL fuzzing, schema abuse, rate-limit bypass",
    prompt:
      "You are Wraith — Lead of API attacks. Master of REST + GraphQL: introspection abuse, batch attacks, mass-assignment, rate-limit bypass. Use kiterunner, Postman, graphql-cop. Output sample requests + payloads.",
  },
  {
    codename: "GOLEM",
    role: "Cloud Lead",
    specialty: "AWS/GCP/Azure misconfigs, IAM, S3, container escape",
    prompt:
      "You are Golem — Lead of Cloud security. You specialize in AWS/GCP/Azure misconfigs, IAM privilege escalation, S3 enumeration, container escapes, and Prowler/ScoutSuite/CloudSploit audits. Output exact CLI commands.",
  },
  {
    codename: "MAGE",
    role: "Mobile Lead",
    specialty: "Android/iOS, Frida, MobSF, SSL pinning bypass",
    prompt:
      "You are Mage — Lead of Mobile security. Specialist in APK/IPA static + dynamic analysis with MobSF, Frida hooking, SSL pinning bypass, deeplink abuse, and IPC attacks. Provide Frida snippets in code blocks.",
  },
  {
    codename: "FORGE",
    role: "Exploit Dev Lead",
    specialty: "PoC engineering, CVE weaponization, payload chaining",
    prompt:
      "You are Forge — Lead of Exploit Development. You write working PoCs, weaponize CVEs, and chain payloads. Use pwntools, ROP, and modern bypasses. Output runnable scripts in code blocks.",
  },
  {
    codename: "SCRIBE",
    role: "Reporting Lead",
    specialty: "Bug bounty report writing, CVSS scoring, triage liaison",
    prompt:
      "You are Scribe — Lead of Reporting. You craft high-impact HackerOne / Bugcrowd reports: clear repro, business impact, CVSS scoring, and remediation. Format reports in markdown.",
  },
  {
    codename: "WARDEN",
    role: "Recon Automation Lead",
    specialty: "Continuous recon pipelines, change detection, asset diffing",
    prompt:
      "You are Warden — Lead of Continuous Recon. You design automation pipelines: subfinder + httpx + nuclei + notify, asset diffing, JS endpoint monitoring. Output bash/yaml automation snippets.",
  },
];

const statusColor = {
  active: "bg-primary",
  working: "bg-primary animate-pulse-gold",
  idle: "bg-muted-foreground",
};

interface RightSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const STORAGE_KEY = "liq.activeLeads";
const TOGGLE_KEY = "liq.leadToggles";

const BASE_LEAD_NAMES = baseAgents.filter(a => a.type === "lead").map(a => a.name);

export default function RightSidebar({ collapsed, onToggle }: RightSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [extraLeads, setExtraLeads] = useState<Agent[]>([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExtraLeads(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem(TOGGLE_KEY);
      if (raw) setToggles(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("commander_personas")
      .select("name,is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }: any) => setActivePersona(data?.name ?? null));
  }, [user, showPersonas]);

  const persistLeads = (next: Agent[]) => {
    setExtraLeads(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const persistToggles = (next: Record<string, boolean>) => {
    setToggles(next);
    try {
      localStorage.setItem(TOGGLE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("liq:leads-changed"));
    } catch {}
  };

  const isOn = (name: string) => toggles[name] !== false; // default ON

  const toggleLead = (name: string) => {
    persistToggles({ ...toggles, [name]: !isOn(name) });
  };

  const allLeads = [...baseAgents.filter(a => a.type === "lead"), ...extraLeads];
  const activeCodenames = new Set(allLeads.map(a => a.name));

  const addLead = (tpl: (typeof LEAD_TEMPLATES)[number]) => {
    if (activeCodenames.has(tpl.codename)) return;
    const next: Agent[] = [
      ...extraLeads,
      {
        name: tpl.codename,
        role: tpl.role,
        status: "idle",
        type: "lead",
        prompt: tpl.prompt,
      },
    ];
    persistLeads(next);
    persistToggles({ ...toggles, [tpl.codename]: true });
  };

  const removeLead = (codename: string) => {
    persistLeads(extraLeads.filter(a => a.name !== codename));
  };

  const onCount = allLeads.filter(l => isOn(l.name)).length;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 48 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full border-l border-border bg-sidebar overflow-hidden"
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute top-3 left-0 -translate-x-1/2 z-20 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center hover:border-primary transition-colors"
      >
        {collapsed ? (
          <ChevronLeft className="w-3 h-3 text-primary" />
        ) : (
          <ChevronRight className="w-3 h-3 text-primary" />
        )}
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border">
        <Users className="w-4 h-4 text-primary shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono text-xs font-bold text-primary tracking-wider neon-gold"
            >
              AGENT ROSTER
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-4"
            >
              {/* Command Team */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <User className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                    Command
                  </span>
                </div>
                <div className="space-y-1">
                  {baseAgents.filter(a => a.type === "manager").map(agent => (
                    <AgentCard
                      key={agent.name}
                      agent={{ ...agent, role: activePersona ? `${agent.role} · ${activePersona}` : agent.role }}
                      onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)}
                    />
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setShowPersonas(true)}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 hover:border-primary text-primary text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    <UserCog className="w-3 h-3" />
                    Personas
                  </button>
                  <button
                    onClick={() => navigate("/commander/sessions")}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 hover:border-primary text-primary text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    Sessions
                  </button>
                </div>
              </div>

              {/* Leads */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Swords className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                      Leads
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      ({onCount}/{allLeads.length} on)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddLead(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 hover:border-primary text-primary text-[9px] font-mono uppercase transition-colors"
                    title="Add Specialty Lead"
                  >
                    <Plus className="w-2.5 h-2.5" /> Add
                  </button>
                </div>
                <div className="space-y-1">
                  {allLeads.map(agent => {
                    const removable = !baseAgents.some(b => b.name === agent.name);
                    const on = isOn(agent.name);
                    return (
                      <AgentCard
                        key={agent.name}
                        agent={agent}
                        on={on}
                        onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)}
                        onTogglePower={() => toggleLead(agent.name)}
                        onRemove={removable ? () => removeLead(agent.name) : undefined}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Raiders */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                    Raiders
                  </span>
                </div>
                <div className="space-y-1">
                  {raiders.map(agent => (
                    <AgentCard key={agent.name} agent={agent} onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)} />
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-border pt-3 space-y-2">
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                  Mission Stats
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="Leads On" value={`${onCount}`} />
                  <StatBox label="Raiders" value={String(raiders.length)} />
                  <StatBox label="Vulns" value="3" />
                  <StatBox label="Uptime" value="2h" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
            onClick={() => setShowAddLead(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-1 border border-primary/30 rounded-lg neon-gold-box overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-primary" />
                  <h3 className="font-mono text-xs font-bold text-primary tracking-widest neon-gold">
                    DEPLOY SPECIALTY LEAD
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddLead(false)}
                  className="p-1 rounded hover:bg-surface-2 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-2 border-b border-border bg-surface-2/40">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Active leads appear dimmed. Pick a specialty to deploy into the current session.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEAD_TEMPLATES.map(tpl => {
                  const active = activeCodenames.has(tpl.codename);
                  return (
                    <button
                      key={tpl.codename}
                      disabled={active}
                      onClick={() => addLead(tpl)}
                      className={`text-left rounded-md border p-3 transition-all ${
                        active
                          ? "border-border bg-surface-2/30 opacity-40 cursor-not-allowed"
                          : "border-border bg-surface-2/60 hover:border-primary hover:neon-gold-box cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-mono text-xs font-bold tracking-widest ${
                            active ? "text-muted-foreground" : "text-primary neon-gold"
                          }`}
                        >
                          {tpl.codename}
                        </span>
                        {active ? (
                          <span className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground uppercase">
                            <Check className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <Plus className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <div
                        className={`text-[10px] font-mono uppercase tracking-wide mb-1 ${
                          active ? "text-muted-foreground/60" : "text-foreground/80"
                        }`}
                      >
                        {tpl.role}
                      </div>
                      <p
                        className={`text-[10px] leading-relaxed ${
                          active ? "text-muted-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {tpl.specialty}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PersonasDialog
        open={showPersonas}
        onClose={() => setShowPersonas(false)}
        onActiveChange={setActivePersona}
      />
    </motion.aside>
  );
}

function AgentCard({
  agent,
  onClick,
  onRemove,
  onTogglePower,
  on,
}: {
  agent: Agent;
  onClick?: () => void;
  onRemove?: () => void;
  onTogglePower?: () => void;
  on?: boolean;
}) {
  const dimmed = onTogglePower && on === false;
  return (
    <div
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors group ${
        dimmed
          ? "bg-surface-2/20 border-border/50 opacity-50"
          : "bg-surface-2/50 border-border hover:border-primary/40 hover:bg-surface-2"
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${dimmed ? "bg-muted-foreground" : statusColor[agent.status]}`} />
      <button onClick={onClick} className="flex-1 min-w-0 text-left cursor-pointer">
        <div className={`text-[11px] font-mono font-semibold truncate group-hover:text-primary ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
          {agent.name}
        </div>
        <div className="text-[9px] font-mono text-muted-foreground truncate">{agent.role}</div>
      </button>
      {onTogglePower && (
        <button
          onClick={onTogglePower}
          className={`p-0.5 rounded transition-colors ${
            on
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:text-primary hover:bg-surface-1"
          }`}
          title={on ? "Turn OFF (exclude from session)" : "Turn ON (include in session)"}
        >
          <Power className="w-3 h-3" />
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-1 text-muted-foreground hover:text-destructive transition-all"
          title="Remove from session"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2/50 border border-border p-2 text-center">
      <div className="text-sm font-mono font-bold text-primary neon-gold">{value}</div>
      <div className="text-[9px] font-mono text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
