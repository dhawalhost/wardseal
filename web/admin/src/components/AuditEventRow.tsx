import React from 'react';
import { ChevronUp, Eye, Terminal, Binary } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassTableRow } from '@/components/layout';
import { TableCell } from '@/components/ui/table';

interface AuditEvent {
    id: string;
    timestamp: string;
    actor_id: string;
    actor_type: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    outcome: string;
    details: Record<string, unknown>;
}

interface AuditEventRowProps {
    event: AuditEvent;
    expandedEventId: string | null;
    setExpandedEventId: (id: string | null) => void;
    formatDate: (dateStr: string) => string;
}

export const AuditEventRow: React.FC<AuditEventRowProps> = ({
    event,
    expandedEventId,
    setExpandedEventId,
    formatDate
}) => {
    return (
        <React.Fragment>
            <GlassTableRow className={`hover:bg-surface-container/20 transition-[color,background-color,border-color,opacity,transform] border-b border-on-surface/5 last:border-0 group ${expandedEventId === event.id ? 'bg-primary/5' : ''}`}>
                <TableCell className="py-1.5 pl-4">
                    <div className="flex items-center gap-2.5">
                        <div className={`h-1 w-1 rounded-full transition-[color,background-color,border-color,opacity,transform] ${event.outcome === 'success' ? 'bg-success' : 'bg-destructive/100'}`} />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-on-surface transition-colors">
                            {formatDate(event.timestamp)}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="py-2 text-xs font-medium text-on-surface group-hover:text-primary transition-colors">
                    {event.action}
                </TableCell>
                <TableCell className="py-1.5 font-medium text-xs text-on-surface-variant">
                    <div className="flex flex-col">
                        <span className="text-[7px] font-medium tracking-tight text-primary mb-0 flex items-center opacity-60">{event.resource_type}</span>
                        <span className="truncate max-w-[120px]" title={event.resource_name || event.resource_id}>
                            {event.resource_name || event.resource_id}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="py-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center bg-surface-container rounded-md text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-[color,background-color,border-color,opacity,transform]">
                            <Terminal className="h-2.5 w-2.5" />
                        </div>
                        <code className="text-xs font-medium text-muted-foreground">
                            {event.actor_id ? event.actor_id.substring(0, 10) : "system"}
                        </code>
                    </div>
                </TableCell>
                <TableCell className="py-2">
                    <Badge
                        className={`rounded-md font-medium text-xs px-1.5 py-0 shadow-none border-none ${event.outcome === 'success' ? 'bg-success-subtle text-success-subtle-foreground' : 'bg-destructive/10 text-error-subtle-foreground'}`}
                    >
                        {event.outcome === 'success' ? 'success' : 'failure'}
                    </Badge>
                </TableCell>
                <TableCell className="py-1.5 text-right pr-4">
                    <Button aria-label="Toggle event details" aria-expanded={expandedEventId === event.id}
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 rounded-md transition-[color,background-color,border-color,opacity,transform] ${expandedEventId === event.id ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-container'}`}
                        onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                    >
                        {expandedEventId === event.id ? <ChevronUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                </TableCell>
            </GlassTableRow>
            {expandedEventId === event.id && (
                <GlassTableRow className="bg-surface-container/30 border-none select-text">
                    <TableCell colSpan={6} className="p-0">
                        <div className="p-4 space-y-4 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between border-b border-on-surface/5 pb-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-medium text-primary flex items-center gap-2">
                                        <Binary className="w-3.5 h-3.5" />
                                        Event Details
                                    </h4>
                                    <p className="text-muted-foreground font-medium text-xs">Captured at {new Date(event.timestamp).toISOString()}</p>
                                </div>
                                <div className="bg-card p-1.5 px-3 rounded-lg ring-1 ring-on-surface/5 text-xs font-medium text-muted-foreground shadow-sm">
                                    ID: {event.id.substring(0, 8)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                    <div className="bg-card rounded-xl ring-1 ring-on-surface/5 p-3 relative overflow-hidden shadow-overlay shadow-on-surface/5 group/payload">
                                        <div className="relative z-10 space-y-4">
                                            <span className="text-xs font-medium text-on-surface-subtle">// Raw Data</span>
                                            <pre className="text-on-surface font-mono text-xs leading-relaxed overflow-auto max-h-[300px] custom-scrollbar p-4 bg-surface-container/30 rounded-xl ring-1 ring-on-surface/5">
                                                {JSON.stringify(event.details, null, 4)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-card rounded-xl ring-1 ring-on-surface/5 p-4 space-y-2 shadow-card shadow-on-surface/5">
                                        <span className="text-xs font-medium text-muted-foreground">Actor</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-surface-container-low text-primary flex items-center justify-center font-medium text-xs">@</div>
                                            <span className="text-xs font-medium text-on-surface truncate">{event.actor_id || 'System'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-card rounded-xl ring-1 ring-on-surface/5 p-4 space-y-2 shadow-card shadow-on-surface/5">
                                        <span className="text-xs font-medium text-muted-foreground">Resource</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-surface-container-low text-primary flex items-center justify-center font-medium text-xs">#</div>
                                            <span className="text-xs font-medium text-on-surface truncate">{event.resource_id}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="w-full rounded-xl ring-1 ring-on-surface/5 hover:bg-card hover:text-primary font-medium text-xs h-10 transition-[color,background-color,border-color,opacity,transform] shadow-sm"
                                        onClick={() => setExpandedEventId(null)}
                                    >
                                        Minimize details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TableCell>
                </GlassTableRow>
            )}
        </React.Fragment>
    );
};
