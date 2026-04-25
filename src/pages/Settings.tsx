import { Settings as SettingsIcon, Bell, Shield, Palette, Database } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useState } from "react";

export default function Settings() {
  const [notify, setNotify] = useState(true);
  const [dark, setDark] = useState(true);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [retention, setRetention] = useState(90);

  const sections = [
    {
      title: "NOTIFICATIONS", icon: Bell, items: [
        { label: "Critical finding alerts", toggle: notify, onChange: setNotify, hint: "Get notified when scans surface critical issues" },
      ]
    },
    {
      title: "SECURITY", icon: Shield, items: [
        { label: "Auto-confirm exploits", toggle: autoConfirm, onChange: setAutoConfirm, hint: "Automatically validate proof-of-concept payloads (use with caution)" },
      ]
    },
    {
      title: "APPEARANCE", icon: Palette, items: [
        { label: "Dark velvet theme", toggle: dark, onChange: setDark, hint: "Default LiQ.Raid3r palette" },
      ]
    },
  ];

  return (
    <AppLayout title="SETTINGS" subtitle="Operator preferences & defaults" icon={SettingsIcon}>
      <div className="p-5 max-w-2xl space-y-4">
        {sections.map(sec => (
          <div key={sec.title} className="bg-surface-1 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <sec.icon className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">{sec.title}</h2>
            </div>
            <div className="divide-y divide-border">
              {sec.items.map(item => (
                <div key={item.label} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-foreground">{item.label}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.hint}</div>
                  </div>
                  <button
                    onClick={() => item.onChange(!item.toggle)}
                    className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${item.toggle ? "bg-primary" : "bg-surface-2 border border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${item.toggle ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">DATA RETENTION</h2>
          </div>
          <div className="px-4 py-3">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Keep scan history for {retention} days</label>
            <input
              type="range" min={7} max={365} value={retention}
              onChange={e => setRetention(+e.target.value)}
              className="w-full accent-primary mt-2"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
