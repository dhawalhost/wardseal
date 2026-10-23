import React, { useEffect, useState } from 'react';
import { getAccessRequests, approveAccessRequest, rejectAccessRequest } from '../api';
import { Link } from 'react-router-dom';
import { TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Plus, GitPullRequest, Activity, ShieldCheck, Loader2 } from 'lucide-react';
import { PageHeader, PageLayout, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow } from '@/components/layout';
import { AccessRequestRow } from '../components/AccessRequestRow';


const AccessRequests: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await getAccessRequests();
            setRequests(data.requests || []);
        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await approveAccessRequest(id, 'Approved by admin');
            fetchRequests();
        } catch (err) {
            console.error(err);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await rejectAccessRequest(id, 'Rejected by admin');
            fetchRequests();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && requests.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<GitPullRequest className="w-6 h-6 text-secondary" />}
                title="Access Requests"
                description="Review and manage requests for temporary access to restricted resources."
                actions={
                     <Link to="/request-access">
                        <Button className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> New Request
                        </Button>
                    </Link>
                }
            />

            {error && (
                <div className="bg-destructive/5 text-destructive px-5 py-3 rounded-lg border border-destructive/20 text-sm font-semibold flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-card">
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardContent className="p-card">
                         <div className="flex flex-col gap-2">
                             <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pending</span>
                            <div className="mt-3 flex items-end gap-3 leading-none">
                                <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{requests.filter(r => r.status === 'pending').length}</span>
                                <GitPullRequest className="h-5 w-5 text-muted-foreground mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardContent className="p-card">
                         <div className="flex flex-col gap-2">
                             <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Approved</span>
                            <div className="mt-3 flex items-end gap-3 leading-none">
                                <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{requests.filter(r => r.status === 'approved').length}</span>
                                <ShieldCheck className="h-5 w-5 text-success mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="md:col-span-2 border border-secondary/20 shadow-sm bg-secondary overflow-hidden rounded-lg text-secondary-foreground">
                    <GlassCardContent className="p-card h-full flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 text-secondary-foreground/10 rotate-12">
                            <Activity className="w-32 h-32" />
                        </div>
                          <h3 className="text-xl font-bold tracking-tight relative z-10">Temporary Access</h3>
                        <p className="text-sm font-medium text-secondary-foreground/80 mt-2 relative z-10">
                            All access decisions are logged for compliance auditing.
                        </p>
                    </GlassCardContent>
                </GlassCard>
            </div>

            <div className="space-y-page">
                 <div className="flex items-center gap-4">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground flex-shrink-0 uppercase">Requests Queue</h2>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardHeader className="py-card px-card border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                                <Activity className="w-4 h-4 text-secondary" />
                            </div>
                             <div>
                                <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Request Details</GlassCardTitle>
                                <p className="text-muted-foreground text-sm mt-0.5">List of active requests and their status.</p>
                            </div>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="p-0">
                        {requests.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                     <GitPullRequest className="h-12 w-12" />
                                    <span className="text-sm font-medium">No pending requests.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <GlassTable>
                                     <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                            <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">User</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Resource</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Duration</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                            <GlassTableHead className="py-3 text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {requests.map(req => (
                                            <AccessRequestRow
                                                key={req.id}
                                                req={req}
                                                handleApprove={handleApprove}
                                                handleReject={handleReject}
                                            />
                                        ))}
                                    </TableBody>
                                </GlassTable>
                            </div>
                        )}
                    </GlassCardContent>
                </GlassCard>
            </div>
        </div>
        </PageLayout>
    );
};

export default AccessRequests;
