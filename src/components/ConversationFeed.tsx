import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Crosshair, User, Swords, Activity, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  role: "user" | "manager" | "lead" | "raider";
  content: string;
  timestamp: string;
  leadName?: string;
}

const roleStyles = {
  user: { border: "border-foreground/20", badge: "bg-foreground/10 text-foreground", icon: User },
  manager: { border: "border-primary/40", badge: "bg-primary/15 text-primary", icon: Crosshair },
  lead: { border: "border-primary/25", badge: "bg-primary/10 text-primary", icon: Swords },
  raider: { border: "border-border", badge: "bg-surface-3 text-muted-foreground", icon: Activity },
};

const sampleMessages: Message[] = [
  {
    id: "1",
    sender: "You",
    role: "user",
    content: "Alright team, we have a new target. Let's start with recon on the scope provided. I want full subdomain enumeration, port scanning, and tech stack fingerprinting. Let's move.",
    timestamp: "14:32",
  },
  {
    id: "2",
    sender: "COMMANDER",
    role: "manager",
    content: "Copy that. Initiating mission briefing. PHANTOM — you're on recon. Get subdomains, DNS records, and map the attack surface. VIPER — prep exploit modules for common web vulns once we have endpoints. SPECTER — stand by for payload generation once we identify injection points.",
    timestamp: "14:32",
  },
  {
    id: "3",
    sender: "PHANTOM",
    role: "lead",
    leadName: "Recon Lead",
    content: "Roger. Spinning up Raiders for subdomain enumeration and port scanning. R-001, initiate full TCP scan on primary target. R-002, run subfinder + amass for subdomain discovery. I'll correlate results once they report back.",
    timestamp: "14:33",
  },
  {
    id: "4",
    sender: "R-001",
    role: "raider",
    content: "Port scan initiated on target range. Running SYN scan across top 10,000 ports. ETA: ~4 minutes. Will report open services with version detection.",
    timestamp: "14:33",
  },
  {
    id: "5",
    sender: "R-002",
    role: "raider",
    content: "Subdomain enumeration started. Sources: subfinder, amass, crt.sh, SecurityTrails. Cross-referencing with DNS bruteforce. Found 47 subdomains so far, filtering wildcards...",
    timestamp: "14:34",
  },
  {
    id: "6",
    sender: "VIPER",
    role: "lead",
    leadName: "Exploit Lead",
    content: "Standing by. I've pre-loaded modules for SQLi, XSS, SSRF, and IDOR based on the target's tech stack hints from the scope doc. Once PHANTOM has endpoints, I'll deploy targeted Raiders.",
    timestamp: "14:35",
  },
  {
    id: "7",
    sender: "R-001",
    role: "raider",
    content: "Scan complete. 23 open ports detected. Notable: 80/443 (nginx 1.21), 8080 (Apache Tomcat), 3000 (Node.js), 5432 (PostgreSQL — filtered). Sending full results to PHANTOM.",
    timestamp: "14:38",
  },
  {
    id: "8",
    sender: "PHANTOM",
    role: "lead",
    leadName: "Recon Lead",
    content: "Good work R-001. Correlating with R-002's subdomain results now. We have 3 interesting subdomains running different services: api.target.com (Node), admin.target.com (Tomcat), staging.target.com (nginx). Sharing attack surface map with VIPER and SPECTER.",
    timestamp: "14:39",
  },
];

export default function ConversationFeed() {
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "You",
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
  };

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
            ACTIVE — BUG BOUNTY #0042
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>8 messages</span>
          <span>•</span>
          <span>4 agents active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const style = roleStyles[msg.role];
          const Icon = style.icon;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex gap-3 ${msg.role === "raider" ? "ml-8" : ""}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center border ${style.border} bg-surface-2`}>
                <Icon className={`w-3.5 h-3.5 ${msg.role === "manager" || msg.role === "lead" ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-mono font-bold ${msg.role === "user" ? "text-foreground" : "text-primary"}`}>
                    {msg.sender}
                  </span>
                  {msg.leadName && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {msg.leadName}
                    </span>
                  )}
                  {msg.role === "raider" && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground">
                      Raider
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-muted-foreground">{msg.timestamp}</span>
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
            Press Enter to send • Agents will respond automatically
          </span>
        </div>
      </div>
    </div>
  );
}
