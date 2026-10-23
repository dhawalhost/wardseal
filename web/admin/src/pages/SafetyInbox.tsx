import React, { useEffect, useState } from 'react';
import { getSafetyActions, confirmSafetyAction, rejectSafetyAction } from '../api';
import { TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ShieldAlert, History, Activity, Loader2 } from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';

const SafetyInbox: React.FC = () => {
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchActions = async () => {
        try {
            setLoading(true);
            const data = await getSafetyActions('pending');
            setActions(data.actions || []);
        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch safety actions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();
    }, []);

    const handleConfirm = async (id: string) => {
        try {
            await confirmSafetyAction(id, 'Confirmed via Dashboard');
            fetchActions();
        } catch (err) {
            alert('Failed to confirm safety action');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectSafetyAction(id, 'Cancelled via Dashboard');
            fetchActions();
        } catch (err) {
            alert('Failed to reject safety action');
        }
    };

    if (loading) return (
        <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<ShieldAlert className="w-6 h-6 text-destructive" />}
                title="Security Alerts"
                description="Review and approve automated security actions. Stop unauthorized access or lock accounts in response to threats."
                actions={
                    <Button
                        variant="outline"
                        onClick={() => fetchActions()}
                        className="h-9 rounded-lg bg-card border border-border font-semibold text-sm px-4 shadow-sm"
                    >
                        <History className="mr-1.5 h-4 w-4" /> Refresh
                    </Button>
                }
            />

            {error && (
                <div className="bg-destructive/5 text-destructive px-5 py-3 rounded-lg flex items-center gap-3 text-sm font-semibold border border-destructive/20">
                    <ShieldAlert className="h-4 w-4" />
                    {error}
                </div>
            )}

            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                <GlassCardHeader className="border-b border-border py-card px-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Pending alerts</GlassCardTitle>
                            <p className="text-muted-foreground text-sm mt-0.5">{actions.length} actions awaiting review</p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <GlassTable>
                        <GlassTableHeader>
                             <GlassTableRow className="hover:bg-transparent border-b border-border">
                                <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Action type</GlassTableHead>
                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Target</GlassTableHead>
                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Reason</GlassTableHead>
                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Details</GlassTableHead>
                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Time</GlassTableHead>
                                <GlassTableHead className="text-right font-semibold text-xs tracking-wide text-muted-foreground pr-card uppercase">Actions</GlassTableHead>
                            </GlassTableRow>
                        </GlassTableHeader>
                        <TableBody>
                            {actions.length === 0 ? (
                                <GlassTableRow>
                                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-success-subtle flex items-center justify-center">
                                                <Check className="h-6 w-6 text-success" />
                                            </div>
                                            <span className="font-medium text-sm">No pending security alerts.</span>
                                        </div>
                                    </TableCell>
                                </GlassTableRow>
                            ) : (
                                actions.map((action) => (
                                    <GlassTableRow key={action.id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                        <TableCell className="py-card pl-card">
                                            <Badge className="bg-destructive/10 text-destructive border-none rounded-md font-semibold text-xs px-2 py-0.5">
                                                {action.action_type ? (action.action_type.charAt(0).toUpperCase() + action.action_type.slice(1).toLowerCase()).replaceAll('_', ' ') : 'Unknown Action'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-card font-mono text-xs font-semibold text-on-surface">{action.target_id}</TableCell>
                                        <TableCell className="py-card max-w-xs text-sm font-medium text-muted-foreground">{action.reason}</TableCell>
                                        <TableCell className="py-card">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {Array.isArray(action.metadata?.org_ids) && action.metadata.org_ids.map((org: string) => (
                                                    <Badge key={org} className="bg-muted text-muted-foreground border-none rounded-md font-semibold text-[10px] px-2 py-0.5">
                                                        {org}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-card">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold text-on-surface">{new Date(action.created_at).toLocaleDateString()}</span>
                                                <span className="text-xs font-mono font-medium text-muted-foreground">{new Date(action.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-card text-right pr-card">
                                            <div className="flex justify-end gap-2">
                                                 <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-destructive hover:opacity-90 text-secondary-foreground font-semibold text-xs px-3 shadow-sm"
                                                    onClick={() => handleConfirm(action.id)}
                                                >
                                                    <Check className="h-3.5 w-3.5 mr-1.5" /> Confirm
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-card border border-border font-semibold text-xs px-3 shadow-sm text-muted-foreground"
                                                    onClick={() => handleReject(action.id)}
                                                >
                                                    <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </GlassTableRow>
                                ))
                            )}
                        </TableBody>
                    </GlassTable>
                </GlassCardContent>
            </GlassCard>
        </div>
        </PageLayout>
    );
};

export default SafetyInbox;
