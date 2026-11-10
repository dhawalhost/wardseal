import React from 'react';
import { Fingerprint, Trash2 } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassTableRow } from '@/components/layout';

interface Organization {
    id: string;
    name: string;
    display_name?: string;
    domain?: string;
    domain_verified: boolean;
    created_at: string;
}

interface OrganizationRowProps {
    org: Organization;
    openVerifyModal: (id: string) => void;
    handleDelete: (id: string) => void;
}

export const OrganizationRow: React.FC<OrganizationRowProps> = ({
    org,
    openVerifyModal,
    handleDelete,
}) => {
    return (
        <GlassTableRow className="hover:bg-surface-container/10 transition-[color,background-color,border-color,opacity,transform] border-b border-on-surface/5 last:border-0 group">
            <TableCell className="py-3 pl-6">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-[color,background-color,border-color,opacity,transform]">
                        <Fingerprint className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-medium text-on-surface group-hover:text-primary transition-colors">{org.name}</span>
                        {org.display_name && <span className="text-xs font-medium text-muted-foreground mt-0.5">{org.display_name}</span>}
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-3">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                    {org.domain || 'Unbound'}
                </span>
            </TableCell>
            <TableCell className="py-3">
                {org.domain_verified ? (
                    <Badge className="bg-success-subtle text-success-subtle-foreground border-none rounded-lg font-medium text-xs px-3 py-1 shadow-sm">Verified root</Badge>
                ) : org.domain ? (
                    <Button 
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg bg-warning-subtle text-warning-subtle-foreground hover:bg-warning-subtle font-medium text-xs px-3 transition-[color,background-color,border-color,opacity,transform]" 
                        onClick={() => openVerifyModal(org.id)}
                    >
                        Run validation
                    </Button>
                ) : (
                    <span className="text-xs font-medium opacity-20 italic">Pending bind</span>
                )}
            </TableCell>
            <TableCell className="py-3 text-right pr-6">
                <Button aria-label="Delete organization" 
                    size="icon" 
                    variant="ghost" 
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-[color,background-color,border-color,opacity,transform]" 
                    onClick={() => handleDelete(org.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </GlassTableRow>
    );
};
