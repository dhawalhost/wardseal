import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, 
    Send, 
    Bot, 
    User, 
    Loader2, 
    ShieldCheck, 
    Activity, 
    History,
    RefreshCw,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    PageHeader, 
    GlassCard, 
    PageLayout
} from '@/components/layout';
import { askAI, getAuditLogs } from '@/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'bot' | 'user';
  text: string;
  timestamp: string;
}

const SUGGESTED_PROMPTS = [
    "Analyze current risk profile",
    "List all high-priority pending requests",
    "Who has access to production data?",
    "Summarize recent audit logs",
];

const CopilotPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'bot', 
        text: "Hello! I am your Security Copilot. I have analyzed your identity graph and I'm ready to help you audit your organization's posture.",
        timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
        setLogsLoading(true);
        const res = await getAuditLogs({ limit: 5 });
        setAuditLogs(res.logs || []);
    } catch (err) {
        console.error("Failed to fetch logs", err);
    } finally {
        setLogsLoading(false);
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (customQuery?: string) => {
    const activeQuery = customQuery || query;
    if (!activeQuery.trim() || loading) return;

    const userMsg = activeQuery;
    setQuery('');
    setMessages(prev => [...prev, { 
        role: 'user', 
        text: userMsg,
        timestamp: new Date().toLocaleTimeString()
    }]);
    setLoading(true);

    try {
      const response = await askAI(userMsg);
      setMessages(prev => [...prev, { 
          role: 'bot', 
          text: response.answer,
          timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error('AI Query failed:', error);
      setMessages(prev => [...prev, { 
          role: 'bot', 
          text: "I encountered an error while analyzing the security context. Please ensure the backend AI service is properly configured with OpenRouter.",
          timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
    <div className="space-y-page animate-in fade-in duration-300 h-[calc(100vh-160px)] flex flex-col">
      <PageHeader 
        icon={<Sparkles className="w-6 h-6 text-secondary" />}
        title="Security Copilot"
        description="Ask questions about identity, access, and recent audit activity."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-card overflow-hidden">
        <div className="lg:col-span-1 space-y-6 h-full overflow-y-auto pr-2 hidden lg:block custom-scrollbar">
            <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System status</p>
                <div className="space-y-2">
                    {[
                        { label: 'Identity Graph', status: 'Healthy', icon: <History className="w-3.5 h-3.5" /> },
                        { label: 'Access Policies', status: 'Active', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                        { label: 'Audit Stream', status: 'Recording', icon: <Activity className="w-3.5 h-3.5" /> },
                    ].map(item => (
                        <div key={item.label} className="p-3 rounded-lg bg-card shadow-sm border border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="text-secondary">{item.icon}</div>
                                <span className="text-sm font-semibold text-on-surface">{item.label}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-success bg-success-subtle px-2 py-0.5 rounded-md">{item.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</p>
                <div className="space-y-2">
                    {logsLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-lg" />)
                    ) : auditLogs.length === 0 ? (
                        <div className="p-3 rounded-lg bg-muted/20 border border-dashed border-border text-center">
                            <p className="text-xs font-medium text-muted-foreground">No activity recorded yet.</p>
                        </div>
                    ) : (
                        auditLogs.map((log, i) => (
                            <div key={log.id || i} className="p-3 rounded-lg bg-card shadow-sm border border-border space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">{log.action}</span>
                                    <span className="text-[10px] font-medium text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-xs font-medium text-on-surface leading-tight line-clamp-2">
                                    {log.details?.reason || log.details?.user_id || "System action performed."}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                <Button variant="ghost" onClick={() => window.location.href='/audit'} className="w-full text-xs font-semibold text-secondary hover:text-secondary hover:bg-secondary/5">View Full Audit Log</Button>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested questions</p>
                <div className="flex flex-col gap-2">
                    {SUGGESTED_PROMPTS.map(p => (
                        <button 
                            key={p}
                            onClick={() => handleSend(p)}
                            className="text-left p-3 rounded-lg hover:bg-secondary/5 hover:text-secondary transition-colors border border-transparent hover:border-secondary/10 bg-muted/30"
                        >
                            <span className="text-sm font-medium text-muted-foreground hover:text-secondary">{p}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="lg:col-span-3 flex flex-col h-full bg-card rounded-lg shadow-sm overflow-hidden border border-border">
            <header className="bg-muted/30 px-card py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shadow-sm">
                        <Bot className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                        <h4 className="text-base font-bold tracking-tight text-on-surface">WardSeal Copilot</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 bg-success rounded-full" />
                            <span className="text-xs font-semibold text-success">Online</span>
                        </div>
                    </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-secondary"
                  onClick={() => setMessages([{role: 'bot', text: 'Conversation cleared. How can I help with identity and access?', timestamp: new Date().toLocaleTimeString()}])}
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </header>

            <ScrollArea className="flex-1 px-card py-card bg-card" viewportRef={scrollRef}>
                <div className="space-y-6 max-w-5xl mx-auto">
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                m.role === 'bot' ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                            )}>
                                {m.role === 'bot' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className={cn("space-y-1", m.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "p-4 rounded-lg text-sm font-medium leading-relaxed shadow-sm border border-border max-w-2xl whitespace-pre-wrap",
                                    m.role === 'bot' ? "bg-card text-on-surface" : "bg-muted/50 text-on-surface"
                                )}>
                                    {m.text}
                                </div>
                                <p className={cn("text-xs font-medium text-muted-foreground", m.role === 'user' ? "mr-2 text-right" : "ml-2")}>
                                    {m.timestamp}
                                </p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                            <div className="p-4 rounded-lg bg-card border border-dashed border-border text-sm font-medium text-muted-foreground">
                                Analyzing identity and audit data…
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-card bg-card border-t border-border shrink-0">
                <div className="relative max-w-5xl mx-auto border border-border rounded-lg focus-within:ring-2 focus-within:ring-secondary/20 transition-shadow overflow-hidden">
                    <Input
                        placeholder="Ask about access, risk, or recent governance events…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="h-12 pr-14 border-none bg-transparent text-sm font-medium focus-visible:ring-0 px-4 text-on-surface placeholder:text-muted-foreground"
                    />
                    <div className="absolute right-1.5 top-1.5">
                        <Button
                            onClick={() => handleSend()}
                            disabled={!query.trim() || loading}
                            className="h-9 w-9 rounded-lg shadow-sm bg-secondary text-secondary-foreground hover:opacity-90"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <div className="max-w-5xl mx-auto mt-3 px-1 flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Encrypted in transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">AI answers may need human review</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
    </PageLayout>
  );
};

export default CopilotPage;
