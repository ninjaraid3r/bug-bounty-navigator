import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Radar,
  Globe,
  Shield,
  Bug,
  Terminal,
  Network,
  Crosshair,
  FileSearch,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { icon: Radar, label: "Recon", active: true },
  { icon: Globe, label: "Attack Surface" },
  { icon: Shield, label: "Exploit Lab" },
  { icon: Bug, label: "Vuln Scanner" },
  { icon: Terminal, label: "Payload Forge" },
  { icon: Network, label: "Network Map" },
  { icon: Crosshair, label: "Targets" },
  { icon: FileSearch, label: "Reports" },
  { icon: Zap, label: "Automation" },
  { icon: Settings, label: "Settings" },
];

interface LeftSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function LeftSidebar({ collapsed, onToggle }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState("Recon");

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 48 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full border-r border-border bg-sidebar overflow-hidden"
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute top-3 right-0 translate-x-1/2 z-20 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center hover:border-primary transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-primary" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-primary" />
        )}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-border">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center neon-gold-box shrink-0">
          <Crosshair className="w-4 h-4 text-primary" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-mono font-bold text-primary text-sm tracking-wider neon-gold whitespace-nowrap"
            >
              XBOW
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        {navItems.map(({ icon: Icon, label, active }) => {
          const isActive = activeItem === label;
          return (
            <button
              key={label}
              onClick={() => setActiveItem(label)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-medium transition-all group ${
                isActive
                  ? "bg-primary/10 text-primary neon-gold-border border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gold" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-mono text-muted-foreground"
              >
                SYSTEM ONLINE
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
