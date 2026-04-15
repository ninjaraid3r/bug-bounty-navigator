import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Terminal, Loader2, RotateCcw } from "lucide-react";

interface ToolSandboxProps {
  toolName: string;
  toolDescription: string;
  toolUseCase: string;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tool-sandbox`;

export default function ToolSandbox({ toolName, toolDescription, toolUseCase, onClose }: ToolSandboxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-initialize on mount
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      streamChat([], `Initialize the ${toolName} sandbox and show me what this tool can do.`, true);
    }
  }, []);

  async function streamChat(history: ChatMessage[], userContent: string, isInit = false) {
    const userMsg: ChatMessage = { role: "user", content: userContent };
    const allMessages = isInit ? [] : [...history, userMsg];

    if (!isInit) {
      setMessages(prev => [...prev, userMsg]);
    }
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.length > 0
            ? allMessages.map(m => ({ role: m.role, content: m.content }))
            : [{ role: "user", content: userContent }],
          toolName,
          toolDescription,
          toolUseCase,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(errData.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ Error: ${err.message}` }]);
    }
    setIsLoading(false);
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    streamChat(messages, text);
  };

  const handleReset = () => {
    setMessages([]);
    setInitialized(false);
    setTimeout(() => {
      setInitialized(true);
      streamChat([], `Initialize the ${toolName} sandbox and show me what this tool can do.`, true);
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl h-[80vh] flex flex-col bg-surface-1 border border-border rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center neon-gold-box">
              <Terminal className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">
                {toolName.toUpperCase()} SANDBOX
              </span>
              <p className="text-[9px] font-mono text-muted-foreground">LLM-powered simulation environment</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleReset} className="p-1.5 rounded-md hover:bg-surface-3 text-muted-foreground hover:text-primary transition-colors" title="Reset session">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="w-3 h-3 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-surface-2 border border-border"
              }`}>
                <pre className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </pre>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              </div>
              <div className="bg-surface-2 border border-border rounded-lg px-3 py-2">
                <span className="text-[10px] font-mono text-muted-foreground animate-pulse">Initializing sandbox...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-surface-2">
          <div className="flex items-center gap-2 bg-surface-1 rounded-lg border border-border focus-within:border-primary/30 focus-within:neon-gold-box transition-all">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={`Run ${toolName} commands...`}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="mr-2 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[8px] font-mono text-muted-foreground mt-1.5 px-1">
            ⚡ Simulated environment — results are AI-generated for planning & training
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
