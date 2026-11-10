import React from 'react';
import { Fingerprint, Terminal, Clock } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassTableRow } from '@/components/layout';

interface AccessRequest {
    id: string;
    requester_id: string;
    resource_type: string;
    resource_id: string;
    reason: string;
    duration: string | null;
    status: 'pending' | 'approved' | 'rejected';
}

interface AccessRequestRowProps {
    req: AccessRequest;
    handleApprove: (id: string) => void;
    handleReject: (id: string) => void;
}

export const AccessRequestRow: React.FC<AccessRequestRowProps> = ({
    req,
    handleApprove,
    handleReject,
}) => {
    return (
        <GlassTableRow className="hover:bg-surface-container/10 transition-[color,background-color,border-color,opacity,transform] border-b border-on-surface/5 last:border-0 group">
            <TableCell className="py-3 pl-6">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-[color,background-color,border-color,opacity,transform]">
                        <Fingerprint className="h-4 w-4 opacity-40" />
                    </div>
                     <div className="flex flex-col">
                        <span className="text-[13px] font-medium tracking-tight text-on-surface group-hover:text-primary transition-colors">{req.requester_id}</span>
                        <span className="text-xs font-medium font-mono tracking-tight text-muted-foreground mt-0.5 italic">ID: {req.id.substring(0, 8).toLowerCase()}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-3">
                <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-1.5">
                        <Badge className="bg-surface-container text-on-surface-variant border-none rounded-md font-medium text-xs px-1.5 py-0.5 tracking-tight">{req.resource_type}</Badge>
                        <span className="text-xs font-medium text-muted-foreground tracking-tight flex items-center gap-1.5 italic">
                            <Terminal className="w-3 h-3" />
                            {req.resource_id}
                        </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px]" title={req.reason}>
                        {req.reason}
                    </span>
                </div>
            </TableCell>
            <TableCell className="py-3">
                 {req.duration ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary tracking-tight">
                        <Clock className="w-3 h-3 opacity-40" />
                        {req.duration}
                    </div>
                ) : (
                    <span className="text-xs font-medium text-muted-foreground tracking-tight italic">Permanent</span>
                )}
            </TableCell>
            <TableCell className="py-3">
                 <Badge
                    className={`rounded-lg font-medium text-xs tracking-tight px-2 py-0.5 border-none shadow-sm transition-[color,background-color,border-color,opacity,transform] ${req.status === 'pending' ? 'bg-warning-subtle text-warning-subtle-foreground' :
 req.status === 'approved' ? 'bg-success-subtle text-success-subtle-foreground' :
 'bg-destructive/10 text-error-subtle-foreground'
 }`}
                >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </Badge>
            </TableCell>
            <TableCell className="py-3 text-right pr-6">
                {req.status === 'pending' && (
                     <div className="flex justify-end gap-2">
                        <Button
                            size="sm"
                            className="h-8 rounded-lg bg-success text-success-foreground hover:bg-success font-medium text-xs px-3 shadow-card transition-[color,background-color,border-color,opacity,transform] border-none"
                            onClick={() => handleApprove(req.id)}
                        >
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-destructive hover:bg-destructive/10 font-medium text-xs px-3 transition-[color,background-color,border-color,opacity,transform]"
                            onClick={() => handleReject(req.id)}
                        >
                            Reject
                        </Button>
                    </div>
                )}
            </TableCell>
        </GlassTableRow>
    );
};
