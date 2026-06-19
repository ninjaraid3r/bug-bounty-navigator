import { useState, ReactNode } from "react";
import LeftSidebar from "./LeftSidebar";
import { LucideIcon } from "lucide-react";

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}

export default function AppLayout({ title, subtitle, icon: Icon, children, actions }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <LeftSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 border-b border-border bg-surface-1 flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center neon-gold-box">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">{title}</h1>
              {subtitle && <p className="text-[10px] font-mono text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
