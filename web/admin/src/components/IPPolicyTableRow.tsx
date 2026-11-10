import React from 'react';
import { IPPolicy } from '../api';
import { GlassTableRow } from '@/components/layout';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, MapPin, Network, Globe, Trash2 } from 'lucide-react';

interface IPPolicyTableRowProps {
    policy: IPPolicy;
    onDelete: (id: string) => void;
}

export const IPPolicyTableRow: React.FC<IPPolicyTableRowProps> = ({ policy, onDelete }) => {
    return (
        <GlassTableRow className="hover:bg-surface-container/10 transition-[color,background-color,border-color,opacity,transform] border-b border-on-surface/5 last:border-0 group">
            <TableCell className="py-8 pl-10">
                <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-[color,background-color,border-color,opacity,transform]">
                        {policy.cidr ? <Terminal className="h-5 w-5 opacity-40" /> : <MapPin className="h-5 w-5 opacity-40" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-medium tracking-tight text-on-surface group-hover:text-primary transition-colors">{policy.cidr || policy.country_code || (policy as any).country}</span>
                        <span className="text-xs font-medium font-mono text-muted-foreground mt-1">Id: {policy.id.substring(0, 8)}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-8">
                <Badge className={`rounded-xl font-medium text-xs tracking-tight px-4 py-1.5 border-none shadow-sm transition-[color,background-color,border-color,opacity,transform] ${policy.type === 'allow'
     ? 'bg-success-subtle text-success-subtle-foreground'
                    : 'bg-destructive/10 text-error-subtle-foreground'
                    }`}>
                    {policy.type === 'allow' ? 'Allow' : 'Block'}
                </Badge>
            </TableCell>
            <TableCell className="py-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground group-hover:text-on-surface transition-colors">
                        {policy.cidr ? (
                            <><Network className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100" /> Cidr range</>
                        ) : (
                            <><Globe className="w-4 h-4 text-primary opacity-40 group-hover:opacity-100" /> Geo iso</>
                        )}
                    </div>
                    <span className="text-[12px] font-medium text-muted-foreground tracking-tight">
                        {policy.reason || 'No description provided'}
                    </span>
                </div>
            </TableCell>
            <TableCell className="py-8 text-right pr-10">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 rounded-lg bg-destructive/5 text-error-subtle-foreground border border-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-[color,background-color,border-color,opacity,transform] font-medium text-xs"
                    onClick={() => onDelete(policy.id)}
                >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Revoke
                </Button>
            </TableCell>
        </GlassTableRow>
    );
};
