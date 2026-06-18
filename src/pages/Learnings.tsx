import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Finding {
  id: string;
  title: string;
  severity: string | null;
  description: string | null;
  agent_codename: string | null;
  created_at: string;
}

export default function Learnings() {
  const { user } = useAuth();
  const [items, setItems] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("findings")
        .select("id, title, severity, description, agent_codename, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setItems((data as Finding[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const sevColor = (s?: string | null) =>
    s === "critical" || s === "high" ? "text-destructive" :
    s === "medium" ? "text-orange-400" : "text-muted-foreground";

  return (
    <AppLayout title="LEARNINGS" subtitle="High / medium signal findings & lessons" icon={BookOpen}>
      <div className="p-5 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono">No learnings captured yet. Run a session to populate.</div>
        ) : items.map(it => (
          <div key={it.id} className="bg-surface-1 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{it.title}</span>
              <span className={`text-[10px] font-mono uppercase ${sevColor(it.severity)}`}>{it.severity ?? "info"}</span>
            </div>
            {it.description && <div className="text-[11px] text-muted-foreground mb-1 line-clamp-2">{it.description}</div>}
            <div className="text-[10px] font-mono text-muted-foreground">{it.agent_codename ?? "system"} · {new Date(it.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
