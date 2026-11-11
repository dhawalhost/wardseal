import { useState, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, MessagesSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlassCard } from '@/components/layout';
import { askAI } from '@/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

const CopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Ask about your identity posture, risky grants or pending access requests.' },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim() || loading) return;

    const userMsg = query;
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await askAI(userMsg);
      setMessages((prev) => [...prev, { role: 'bot', text: response.answer }]);
    } catch (error) {
      console.error('AI Query failed:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'The copilot service did not respond. Check that it is running and try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-14 right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <GlassCard className="flex h-[520px] w-[380px] flex-col overflow-hidden border-border shadow-[0_8px_24px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div>
              <p className="text-sm font-medium leading-none text-on-surface">Security copilot</p>
              <p className="mt-1 text-xs text-on-surface-subtle">Answers from your tenant’s directory and audit data</p>
            </div>
            <Button aria-label="Close copilot" variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4 py-4" viewportRef={scrollRef}>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                      m.role === 'bot' ? 'bg-surface-container text-on-surface' : 'bg-primary text-primary-foreground'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 px-1 text-sm text-on-surface-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden />
                  Reading the access graph
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            <div className="relative">
              <Input
                placeholder="Ask a question"
                aria-label="Ask the security copilot"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="h-10 pr-11 text-sm"
              />
              <Button
                aria-label="Send"
                onClick={handleSend}
                disabled={!query.trim() || loading}
                size="icon"
                className="absolute right-1 top-1 h-8 w-8"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
            <p className="mt-2 text-xs text-on-surface-subtle">Check suggestions before acting on them</p>
          </div>
        </GlassCard>
      )}

      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="h-10 gap-2 rounded-md bg-card px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.06)]"
      >
        {isOpen ? <X className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : <MessagesSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
        {isOpen ? 'Close' : 'Ask copilot'}
      </Button>
    </div>
  );
};

export default CopilotWidget;
