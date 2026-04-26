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
} from "lucide-react";

interface Agent {
  name: string;
  role: string;
  status: "active" | "idle" | "working";
  type: "manager" | "lead" | "raider";
}

const agents: Agent[] = [
  { name: "COMMANDER", role: "Manager Agent", status: "active", type: "manager" },
  { name: "PHANTOM", role: "Recon Lead", status: "working", type: "lead" },
  { name: "VIPER", role: "Exploit Lead", status: "active", type: "lead" },
  { name: "SPECTER", role: "Payload Lead", status: "idle", type: "lead" },
];

const raiders: Agent[] = [
  { name: "R-001", role: "Port Scanner", status: "working", type: "raider" },
  { name: "R-002", role: "Subdomain Enum", status: "working", type: "raider" },
  { name: "R-003", role: "Fuzzer", status: "idle", type: "raider" },
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

export default function RightSidebar({ collapsed, onToggle }: RightSidebarProps) {
  const navigate = useNavigate();
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
                  {agents.filter(a => a.type === "manager").map(agent => (
                    <AgentCard key={agent.name} agent={agent} onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)} />
                  ))}
                </div>
                <button
                  onClick={() => navigate("/commander/sessions")}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/30 hover:border-primary text-primary text-[10px] font-mono uppercase tracking-widest transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  Session Reports
                </button>
              </div>

              {/* Leads */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Swords className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                    Leads
                  </span>
                </div>
                <div className="space-y-1">
                  {agents.filter(a => a.type === "lead").map(agent => (
                    <AgentCard key={agent.name} agent={agent} onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)} />
                  ))}
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
                  <StatBox label="Active" value="5" />
                  <StatBox label="Tasks" value="12" />
                  <StatBox label="Vulns" value="3" />
                  <StatBox label="Uptime" value="2h" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-2/50 border border-border hover:border-primary/40 hover:bg-surface-2 transition-colors group cursor-pointer"
    >
      <div className={`w-1.5 h-1.5 rounded-full ${statusColor[agent.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono font-semibold text-foreground truncate group-hover:text-primary">
          {agent.name}
        </div>
        <div className="text-[9px] font-mono text-muted-foreground truncate">
          {agent.role}
        </div>
      </div>
    </button>
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
