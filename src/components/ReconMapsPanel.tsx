import { useEffect, useState } from "react";
import { Map as MapIcon, ChevronRight, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReconMapDetail from "./ReconMapDetail";

interface ReconMapRow {
  id: string;
  target: string;
  summary: string | null;
  tips: any;
  killchain: any;
  node_count: number;
  created_at: string;
  updated_at: string;
  session_id: string | null;
  mission_id: string;
}

export default function ReconMapsPanel() {
  const { user } = useAuth();
  const [maps, setMaps] = useState<ReconMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("recon_maps")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setMaps((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("recon-maps-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recon_maps", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const active = maps.find((m) => m.id === activeId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono uppercase tracking-widest text-primary flex items-center gap-2">
          <MapIcon className="w-4 h-4" /> Recon Maps
        </CardTitle>
        <Badge variant="outline" className="text-[9px]">
          <Lock className="w-2.5 h-2.5 mr-1" /> Permanent memory
        </Badge>
      </CardHeader>
      <CardContent>
        {active ? (
          <ReconMapDetail map={active as any} onBack={() => setActiveId(null)} />
        ) : loading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
        ) : maps.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono">
            No targets mapped yet. Toggle Cartographer ON in the right sidebar and run a recon command — every mission generates a permanent map.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-3">Target</th>
                  <th className="text-left py-2 pr-3">Nodes</th>
                  <th className="text-left py-2 pr-3">Tips</th>
                  <th className="text-left py-2 pr-3">Kill-chain</th>
                  <th className="text-left py-2 pr-3">Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {maps.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setActiveId(m.id)}
                    className="border-b border-border/40 hover:bg-surface-2/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2 pr-3 text-primary truncate max-w-[200px]">{m.target}</td>
                    <td className="py-2 pr-3 text-foreground">{m.node_count}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{Array.isArray(m.tips) ? m.tips.length : 0}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{Array.isArray(m.killchain) ? m.killchain.length : 0}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{new Date(m.updated_at).toLocaleDateString()}</td>
                    <td className="py-2 text-primary"><ChevronRight className="w-3 h-3" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
