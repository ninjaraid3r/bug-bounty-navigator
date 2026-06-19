import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}

/**
 * Page chrome (header + scroll area). The LeftSidebar is provided by
 * the persistent AppShell, so this component no longer mounts it —
 * that's what fixes the navigation flicker.
 */
export default function AppLayout({ title, subtitle, icon: Icon, children, actions }: AppLayoutProps) {
  return (
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
  );
}
