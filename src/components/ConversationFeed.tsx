import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Crosshair, User, Swords, Activity, Loader2 } from "lucide-react";
import { useMission, useMessages } from "@/hooks/useMission";

const roleStyles = {
  user: { border: "border-foreground/20", badge: "bg-foreground/10 text-foreground", icon: User },
  manager: { border: "border-primary/40", badge: "bg-primary/15 text-primary", icon: Crosshair },
  lead: { border: "border-primary/25", badge: "bg-primary/10 text-primary", icon: Swords },
  raider: { border: "border-border", badge: "bg-surface-3 text-muted-foreground", icon: Activity },
};

export default function ConversationFeed() {
  const { mission, conversation, loading: missionLoading } = useMission();
  const { messages, loading: msgLoading, sendMessage } = useMessages(conversation?.id);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  if (missionLoading || msgLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gold" />
          <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">
            MISSION FEED
          </span>
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface-2 border border-border">
            {mission ? `ACTIVE — ${mission.name.toUpperCase()}` : "NO MISSION"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{messages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Crosshair className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No messages yet.</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Command your agents to begin the mission.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const style = roleStyles[msg.role] || roleStyles.user;
          const Icon = style.icon;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex gap-3 ${msg.role === "raider" ? "ml-8" : ""}`}
            >
              <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center border ${style.border} bg-surface-2`}>
                <Icon className={`w-3.5 h-3.5 ${msg.role === "manager" || msg.role === "lead" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-mono font-bold ${msg.role === "user" ? "text-foreground" : "text-primary"}`}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-foreground/85">{msg.content}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface-1">
        <div className="flex items-center gap-2 bg-surface-2 rounded-lg border border-border focus-within:border-primary/30 focus-within:neon-gold-box transition-all">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Command your agents..."
            className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="mr-2 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[9px] font-mono text-muted-foreground">
            Press Enter to send • Messages saved to database
          </span>
        </div>
      </div>
    </div>
  );
}
