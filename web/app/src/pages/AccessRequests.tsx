import React, { useEffect, useState } from 'react';
import { getAccessRequests, approveAccessRequest, rejectAccessRequest } from '../api';
import { Link } from 'react-router-dom';
import { TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ShieldAlert, Plus, GitPullRequest, Activity, Terminal, ExternalLink, ShieldCheck, Clock, Fingerprint, Loader2 } from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow } from '@/components/layout';
import { PortalAccessRequestRow } from '../components/PortalAccessRequestRow';

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

    if (loading && requests.length === 0) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-page animate-in fade-in duration-500">
            <PageHeader
                icon={<GitPullRequest className="w-8 h-8 text-primary" />}
                title="Access requests"
                description="Review and manage requests for temporary access to restricted resources."
                actions={
                    <Link to="/request-access">
                        <Button className="rounded-lg font-semibold text-sm h-10 px-5 shadow-sm bg-secondary text-secondary-foreground">
                            <Plus className="mr-2 h-4 w-4" /> New request
                        </Button>
                    </Link>
                }
            />

            {error && (
                <div className="bg-destructive/10 text-destructive px-5 py-4 rounded-lg border border-destructive/20 text-sm font-medium flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-card">
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                    <GlassCardContent className="p-6">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Pending</span>
                            <div className="mt-2 flex items-end gap-3 leading-none">
                                <span className="text-3xl font-bold tracking-tight text-on-surface">
                                    {requests.filter((r) => r.status === 'pending').length}
                                </span>
                                <GitPullRequest className="h-5 w-5 text-muted-foreground mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                    <GlassCardContent className="p-6">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Approved</span>
                            <div className="mt-2 flex items-end gap-3 leading-none">
                                <span className="text-3xl font-bold tracking-tight text-on-surface">
                                    {requests.filter((r) => r.status === 'approved').length}
                                </span>
                                <ShieldCheck className="h-5 w-5 text-success mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="md:col-span-2 border border-secondary/20 shadow-sm bg-secondary overflow-hidden rounded-xl text-secondary-foreground">
                    <GlassCardContent className="p-6 h-full flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                            <Activity className="w-40 h-40" />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight relative z-10">Temporary access</h3>
                        <p className="text-sm text-secondary-foreground/80 mt-2 relative z-10">
                            Access decisions are logged for compliance auditing.
                        </p>
                    </GlassCardContent>
                </GlassCard>
            </div>

            <div className="space-y-card">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-semibold text-muted-foreground flex-shrink-0">Request queue</h2>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GlassCard className="shadow-sm border-border bg-card overflow-hidden rounded-xl">
                    <GlassCardHeader className="py-6 px-6 border-b border-border">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <GlassCardTitle className="text-lg font-bold tracking-tight text-on-surface">
                                    Request details
                                </GlassCardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Active requests and their status.</p>
                            </div>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="p-0">
                        {requests.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <GitPullRequest className="h-10 w-10 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">No pending requests.</span>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <GlassTable>
                                    <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                            <GlassTableHead className="py-4 pl-6">User</GlassTableHead>
                                            <GlassTableHead>Resource</GlassTableHead>
                                            <GlassTableHead>Duration</GlassTableHead>
                                            <GlassTableHead>Status</GlassTableHead>
                                            <GlassTableHead className="text-right pr-6">Actions</GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <PortalAccessRequestRow
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
    );
};

export default AccessRequests;
