import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Activity,
    Trash2,
    Cpu,
    Loader2,
    ShieldCheck,
    Zap,
    MoreHorizontal,
    Box,
    Terminal,
    RefreshCcw
} from 'lucide-react';
import { getWorkloads, createWorkload } from '../api';
import {
    PageHeader,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassTable,
    GlassTableHeader,
    GlassTableHead,
    GlassTableRow,
    PageLayout
} from '@/components/layout';
import {
    TableBody,
    TableCell
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WorkloadManagement: React.FC = () => {
    const [workloads, setWorkloads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newHandle, setNewHandle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkloads = async () => {
        setLoading(true);
        try {
            const data = await getWorkloads();
            setWorkloads(data || []);
        } catch (err) {
            console.error('Failed to fetch workloads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkloads();
    }, []);

    const handleCreateWorkload = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);
        try {
            await createWorkload({
                name: newName,
                service_handle: newHandle
            });
            setShowCreate(false);
            setNewName('');
            setNewHandle('');
            fetchWorkloads();
        } catch (err: any) {
            console.error(err);
            setError('Failed to create machine account. Check that the service handle is unique.');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading && workloads.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Cpu className="w-6 h-6 text-secondary" />}
                title="Machine Accounts"
                description="Manage accounts for services, scripts, and automated systems."
                actions={
                    <Button onClick={() => setShowCreate(true)} className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" /> Add machine account
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                {[
                    { label: 'Total accounts', value: workloads.length, icon: <Cpu className="w-4 h-4" />, color: 'bg-secondary/10 text-secondary' },
                    { label: 'Active', value: workloads.filter(w => w.status === 'active').length, icon: <Activity className="w-4 h-4" />, color: 'bg-success-subtle text-success' },
                    { label: 'Rotated', value: workloads.filter(w => w.status === 'rotated').length, icon: <Zap className="w-4 h-4" />, color: 'bg-warning/10 text-warning' },
                ].map((stat) => (
                    <GlassCard key={stat.label} className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardContent className="p-card">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground font-semibold text-xs tracking-wide uppercase">{stat.label}</p>
                                    <p className="text-2xl font-bold tracking-tight text-on-surface tabular-nums">{stat.value}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                ))}
            </div>

            <GlassCard className="overflow-hidden border border-border shadow-sm bg-card rounded-xl">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Accounts</GlassCardTitle>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                {workloads.length} managed accounts
                            </p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <GlassTable>
                            <GlassTableHeader>
                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Name</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Service handle</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Last used</GlassTableHead>
                                    <GlassTableHead className="text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {workloads.length === 0 ? (
                                    <GlassTableRow>
                                        <TableCell colSpan={5} className="py-16 text-center text-sm font-medium text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <Box className="h-8 w-8 text-muted-foreground" />
                                                No machine accounts yet.
                                            </div>
                                        </TableCell>
                                    </GlassTableRow>
                                ) : (
                                    workloads.map((w) => (
                                        <GlassTableRow key={w.id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                            <TableCell className="py-card pl-card">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                                                        <Terminal className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm tracking-tight text-on-surface">
                                                            {w.name}
                                                        </span>
                                                        <code className="text-xs font-medium text-muted-foreground mt-0.5 font-mono">
                                                            {w.id.substring(0, 12)}…
                                                        </code>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-card">
                                                <Badge className="bg-muted text-muted-foreground border-none rounded-md text-xs font-semibold py-0.5 px-2">
                                                    {w.service_handle}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-card">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${w.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`} />
                                                    <span className={`text-sm font-semibold ${w.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
                                                        {w.status === 'active' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-card text-sm font-medium text-muted-foreground">
                                                {w.last_used_at ? new Date(w.last_used_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                            </TableCell>
                                            <TableCell className="py-card text-right pr-card">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px] rounded-lg border border-border shadow-sm p-1 bg-card">
                                                        <DropdownMenuItem className="font-semibold text-xs gap-2 py-2 px-3 rounded-md cursor-pointer">
                                                            <RefreshCcw className="w-3.5 h-3.5 text-muted-foreground" /> Reset key
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="font-semibold text-xs gap-2 py-2 px-3 cursor-pointer rounded-md">
                                                            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                                            View activity
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive font-semibold text-xs gap-2 py-2 px-3 cursor-pointer rounded-md focus:bg-destructive/10 focus:text-destructive">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </GlassTableRow>
                                    ))
                                )}
                            </TableBody>
                        </GlassTable>
                    </div>
                </GlassCardContent>
            </GlassCard>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="sm:max-w-[480px] rounded-xl border border-border p-0 overflow-hidden shadow-sm">
                    <DialogHeader className="bg-card p-card border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary rounded-lg text-secondary-foreground shadow-sm">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold tracking-tight">Create machine account</DialogTitle>
                                <DialogDescription className="text-muted-foreground text-sm mt-1">
                                    Add a new identity for an automated service or workload.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <form onSubmit={handleCreateWorkload} className="p-card space-y-4 bg-card">
                        {error && (
                            <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                                <AlertDescription className="font-semibold text-sm">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Name</Label>
                            <Input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. auth-aggregator"
                                className="h-10 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 font-medium text-sm px-4"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Service handle</Label>
                            <Input
                                value={newHandle}
                                onChange={e => setNewHandle(e.target.value)}
                                placeholder="e.g. system:service:aggregator"
                                className="h-10 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 font-medium text-sm px-4 font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg font-semibold text-sm">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating} className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        </PageLayout>
    );
};

export default WorkloadManagement;
