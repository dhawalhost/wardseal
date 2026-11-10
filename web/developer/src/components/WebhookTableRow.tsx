import React from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassTableRow, GlassTableHead } from '@/components/layout';
import { TableCell } from '@/components/ui/table';

interface Webhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
}

interface WebhookTableRowProps {
    webhook: Webhook;
    handleDelete: (id: string) => void;
}

export const WebhookTableRow: React.FC<WebhookTableRowProps> = ({
    webhook,
    handleDelete
}) => {
    return (
        <GlassTableRow className="hover:bg-surface-container/10 transition-[color,background-color,border-color,opacity,transform] border-b border-on-surface/5 last:border-0 group">
            <TableCell className="py-2 pl-5">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-surface-container text-muted-foreground flex items-center justify-center transition-[color,background-color,border-color,opacity,transform] group-hover:bg-primary group-hover:text-primary-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium tracking-tight text-on-surface group-hover:text-primary transition-colors truncate max-w-[180px]">{webhook.url}</span>
                        <span className="text-xs font-medium font-mono tracking-tight text-muted-foreground ">id // {webhook.id?.substring(0, 8)}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-3">
                <div className="flex flex-wrap gap-1.5">
                    {webhook.events.map(ev => (
                        <Badge key={ev} className="bg-surface-container text-muted-foreground border-none rounded-md font-medium text-xs tracking-tight px-2 py-0.5 group-hover:bg-primary/5 group-hover:text-primary transition-[color,background-color,border-color,opacity,transform] ">
                            {ev.split('.')[1]}
                        </Badge>
                    ))}
                </div>
            </TableCell>
            <TableCell className="py-3">
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full transition-[color,background-color,border-color,opacity,transform] ${webhook.active ? 'bg-success' : 'bg-on-surface/20'}`} />
                    <span className={`text-xs font-medium tracking-tight transition-[color,background-color,border-color,opacity,transform] ${webhook.active ? 'text-success' : 'text-muted-foreground'}`}>
                        {webhook.active ? 'Active' : 'Dormant'}
                    </span>
                </div>
            </TableCell>
            <TableCell className="py-3 text-right pr-6">
                <Button aria-label="Delete webhook"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-[color,background-color,border-color,opacity,transform]"
                    onClick={() => handleDelete(webhook.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </TableCell>
        </GlassTableRow>
    );
};
