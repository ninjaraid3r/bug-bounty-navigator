import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Crosshair, ChevronDown, Network, FileSearch, Sparkles, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Targets from "./Targets";
import Reports from "./Reports";
import NetworkMap from "./NetworkMap";

type Section = "network" | "targets" | "reports";

export default function IntelMap() {
  const [open, setOpen] = useState<Section | null>("network");
  const toggle = (s: Section) => setOpen(open === s ? null : s);

  const sections: { key: Section; title: string; subtitle: string; icon: any; node: React.ReactNode }[] = [
    { key: "network", title: "NETWORK MAP", subtitle: "Live topology & Cartographer recon maps", icon: Network, node: <EmbedPage Component={NetworkMap} /> },
    { key: "targets", title: "TARGETS", subtitle: "Bug bounty programs in scope", icon: Crosshair, node: <EmbedPage Component={Targets} /> },
    { key: "reports", title: "REPORTS", subtitle: "Submitted reports & payouts", icon: FileSearch, node: <EmbedPage Component={Reports} /> },
  ];

  return (
    <AppLayout title="INTEL MAP" subtitle="Targets · Network topology · Reports — unified intelligence" icon={Crosshair}>
      <div className="p-5 space-y-3">
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
                <ChevronDown className={`w-4 h-4 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                    <div className="bg-background">
                      {s.node}
                      <div className="px-5 pb-5">
                        <InnovationStrip section={s.key} />
                      </div>
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

// Render the existing page component bare (its own AppLayout shows another header that we hide via CSS scoping)
function EmbedPage({ Component }: { Component: React.ComponentType }) {
  return (
    <div className="intel-embed">
      <style>{`.intel-embed > main > header { display: none; } .intel-embed > main { height: auto; overflow: visible; } .intel-embed > main > div { overflow: visible; max-height: 70vh; }`}</style>
      <Component />
    </div>
  );
}

function InnovationStrip({ section }: { section: Section }) {
  const ideas: Record<Section, string[]> = {
    network: ["AI cluster suspicious nodes", "Auto-link findings to nodes", "Time-travel snapshot of topology"],
    targets: ["Predict next-best target by ROI", "Auto-suggest scope expansion", "Sync new programs nightly"],
    reports: ["AI-draft report from finding", "Track triage-to-payout latency", "Cross-program duplicate detection"],
  };
  return (
    <div className="mt-3 p-3 rounded border border-primary/20 bg-primary/5">
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
