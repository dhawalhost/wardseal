import React, { useState, useEffect } from 'react';
import {
    getIPPolicies,
    createIPPolicy,
    deleteIPPolicy,
    IPPolicy
} from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    ShieldAlert,
    Network,
    Plus,
    ShieldCheck,
    Loader2,
    Activity,
} from 'lucide-react';
import {
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { IPPolicyTableRow } from '../components/IPPolicyTableRow';

const IPPolicies: React.FC = () => {
    const [policies, setPolicies] = useState<IPPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreate, setShowCreate] = useState(false);
    const [newRuleKind, setNewRuleKind] = useState<'cidr' | 'country'>('cidr');
    const [newValue, setNewValue] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAction, setNewAction] = useState<'allow' | 'deny'>('allow');
    const [creating, setCreating] = useState(false);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const data = await getIPPolicies();
            setPolicies(data || []);
        } catch (err) {
            setError('Failed to load IP policies.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleCreatePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createIPPolicy({
                type: newAction as 'allow' | 'block',
                cidr: newRuleKind === 'cidr' ? newValue : undefined,
                country: newRuleKind === 'country' ? newValue : undefined,
                reason: newDesc || undefined,
            });
            setShowCreate(false);
            setNewValue('');
            setNewDesc('');
            fetchPolicies();
        } catch (err) {
            setError('Failed to create IP policy.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!window.confirm('Delete this IP policy? This may affect user access.')) return;
        try {
            await deleteIPPolicy(id);
            fetchPolicies();
        } catch (err) {
            setError('Failed to delete policy.');
        }
    };

    if (loading && policies.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<ShieldCheck className="w-6 h-6 text-secondary" />}
                title="IP Access Policies"
                description="Manage IP-based access rules. Restrict or allow access based on network locations."
                actions={
                    <Dialog open={showCreate} onOpenChange={setShowCreate}>
                        <DialogTrigger asChild>
                            <Button className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm">
                                <Plus className="w-4 h-4 mr-1.5" /> Add IP rule
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px] rounded-xl border border-border p-0 overflow-hidden shadow-sm">
                            <DialogHeader className="bg-card p-card border-b border-border">
                                <DialogTitle className="text-lg font-bold tracking-tight text-on-surface">Create IP rule</DialogTitle>
                                <DialogDescription className="text-muted-foreground text-sm mt-1">
                                    Define a new IP or geo-location access rule.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreatePolicy} className="p-card space-y-4 bg-card">
                                <div className="grid grid-cols-2 gap-card">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Rule type</Label>
                                        <Select value={newRuleKind} onValueChange={(v: any) => setNewRuleKind(v)}>
                                            <SelectTrigger className="h-10 border border-border rounded-lg bg-card focus:ring-secondary/20 font-medium text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg border border-border shadow-sm text-sm">
                                                <SelectItem value="cidr">IP CIDR range</SelectItem>
                                                <SelectItem value="country">Country ISO code</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Action</Label>
                                        <Select value={newAction} onValueChange={(v: any) => setNewAction(v)}>
                                            <SelectTrigger className={`h-10 border border-border rounded-lg bg-card focus:ring-secondary/20 font-medium text-sm ${newAction === 'allow' ? 'text-success' : 'text-destructive'}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg border border-border shadow-sm text-sm">
                                                <SelectItem value="allow" className="text-success">Allow traffic</SelectItem>
                                                <SelectItem value="deny" className="text-destructive">Deny traffic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">{newRuleKind === 'cidr' ? 'IP CIDR range' : 'Country ISO code'}</Label>
                                    <Input
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-mono text-sm px-4"
                                        placeholder={newRuleKind === 'cidr' ? 'e.g. 192.168.1.0/24' : 'ISO 3166-1 alpha-2 (e.g. CN)'}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Description</Label>
                                    <Input
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium text-sm px-4"
                                        placeholder="Purpose of this access rule..."
                                    />
                                </div>

                                <DialogFooter className="pt-2">
                                    <Button type="submit" disabled={creating} className="w-full h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create rule'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                }
            />

            {error && (
                <div className="bg-destructive/5 text-destructive px-5 py-3 rounded-lg border border-destructive/20 text-sm font-semibold">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-card">
                <div className="lg:col-span-1 space-y-page">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <Activity className="w-4 h-4 text-secondary" />
                                </div>
                                <GlassCardTitle className="text-base font-bold tracking-tight">Status</GlassCardTitle>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold tracking-wide text-muted-foreground">Enforcement</span>
                                <Badge className="bg-success-subtle text-success rounded-md font-semibold text-xs px-2 py-0.5 border-none">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold tracking-wide text-muted-foreground">Total rules</span>
                                <span className="text-2xl font-bold tracking-tight text-on-surface tabular-nums">{policies.length}</span>
                            </div>
                        </GlassCardContent>
                    </GlassCard>

                    <div className="bg-secondary text-secondary-foreground p-card rounded-xl flex items-start gap-3 shadow-sm border border-secondary/20">
                        <ShieldAlert className="w-5 h-5 text-secondary-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-relaxed text-secondary-foreground/80">
                            Rules are evaluated by specificity. If no matching rule applies, traffic is allowed by default.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <Network className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Active IP rules</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">
                                        {policies.length} rules configured
                                    </p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-0">
                            <div className="overflow-x-auto">
                                <GlassTable>
                                    <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                            <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">IP rule / location</GlassTableHead>
                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Type</GlassTableHead>
                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Description</GlassTableHead>
                                            <GlassTableHead className="text-right font-semibold text-xs tracking-wide text-muted-foreground pr-card uppercase">Actions</GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {policies.length === 0 ? (
                                            <GlassTableRow>
                                                <TableCell colSpan={4} className="py-16 text-center text-sm font-medium text-muted-foreground">
                                                    No IP policies configured.
                                                </TableCell>
                                            </GlassTableRow>
                                        ) : (
                                            policies.map((policy) => (
                                                <IPPolicyTableRow
                                                    key={policy.id}
                                                    policy={policy}
                                                    onDelete={handleDeletePolicy}
                                                />
                                            ))
                                        )}
                                    </TableBody>
                                </GlassTable>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default IPPolicies;
