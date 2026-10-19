import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPolicies, createPolicy, Policy } from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    ShieldCheck,
    ShieldAlert,
    Plus,
    FileJson,
    Trash2,
    X,
    ArrowUpRight
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { TableBody, TableCell } from '@/components/ui/table';

const Policies: React.FC = () => {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [newPolicy, setNewPolicy] = useState({
        name: '',
        rule_type: 'access_control',
        rule_data: '{\n  "condition": "user.groups.contains(\'admin\')",\n  "effect": "allow"\n}'
    });

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const data = await getPolicies();
            setPolicies(data || []);
        } catch (err) {
            console.error(err);
            setMessage({ text: "Failed to load security policies.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleCreate = async () => {
        try {
            setMessage(null);
            let ruleData = {};
            try {
                ruleData = JSON.parse(newPolicy.rule_data);
            } catch (e) {
                setMessage({ text: "Rule data must be valid JSON.", type: 'error' });
                return;
            }

            await createPolicy({
                name: newPolicy.name,
                rule_type: newPolicy.rule_type,
                rule_data: ruleData,
                is_enabled: true
            });

            setMessage({ text: "Policy created successfully.", type: 'success' });
            setIsCreateOpen(false);
            setNewPolicy({
                name: '',
                rule_type: 'access_control',
                rule_data: '{\n  "condition": "user.groups.contains(\'admin\')",\n  "effect": "allow"\n}'
            });
            fetchPolicies();
        } catch (err) {
            console.error(err);
            setMessage({ text: "Could not create the policy.", type: 'error' });
        }
    };

    if (loading && policies.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<ShieldCheck className="w-6 h-6 text-secondary" />}
                title="Security Policies"
                description="Define security rules for your organization. Control access to resources and data."
                actions={
                    <Button onClick={() => setIsCreateOpen(true)} className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" /> Create policy
                    </Button>
                }
            />

            {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="rounded-lg border border-border bg-card shadow-sm">
                    <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                        {message.type === 'error' ? <ShieldAlert className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-success" />}
                        {message.text}
                    </AlertDescription>
                </Alert>
            )}

            {isCreateOpen && (
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                    <GlassCardHeader className="py-card px-card border-b border-border">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                    <FileJson className="w-5 h-5" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Create policy</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Define access control rules with JSON</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreateOpen(false)} className="rounded-lg h-9 w-9 hover:bg-destructive/10 hover:text-destructive">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="p-card space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-semibold tracking-wide text-muted-foreground">Policy name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Admin access"
                                    className="h-10 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 font-medium text-sm px-4"
                                    value={newPolicy.name}
                                    onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-xs font-semibold tracking-wide text-muted-foreground">Rule type</Label>
                                <Input
                                    id="type"
                                    value={newPolicy.rule_type}
                                    className="h-10 rounded-lg border border-border bg-muted font-medium text-sm px-4"
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule" className="text-xs font-semibold tracking-wide text-muted-foreground">Rule definition (JSON)</Label>
                            <Textarea
                                id="rule"
                                rows={8}
                                className="font-mono text-sm rounded-xl border border-border bg-muted p-4 focus-visible:ring-secondary/20 resize-none"
                                value={newPolicy.rule_data}
                                onChange={(e) => setNewPolicy({...newPolicy, rule_data: e.target.value})}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-9 px-4 rounded-lg font-semibold text-sm text-muted-foreground hover:bg-muted">Cancel</Button>
                            <Button onClick={handleCreate} className="h-9 px-6 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">Create policy</Button>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            )}

            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Policies</GlassCardTitle>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                {policies.length} active policies
                            </p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <GlassTable>
                            <GlassTableHeader>
                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Policy name</GlassTableHead>
                                    <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Rules</GlassTableHead>
                                    <GlassTableHead className="py-3 text-center font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                    <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Created</GlassTableHead>
                                    <GlassTableHead className="py-3 text-right font-semibold text-xs tracking-wide text-muted-foreground pr-card uppercase">Actions</GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {policies.length === 0 ? (
                                    <GlassTableRow>
                                        <TableCell colSpan={5} className="py-16 text-center text-sm font-medium text-muted-foreground">
                                            No policies found.
                                        </TableCell>
                                    </GlassTableRow>
                                ) : (
                                    policies.map(policy => (
                                        <GlassTableRow key={policy.id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                            <TableCell className="py-card pl-card">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                                                        <FileJson className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-semibold tracking-tight text-on-surface truncate">{policy.name}</span>
                                                        <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {policy.id.substring(0, 12)}…</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-card text-sm font-medium text-muted-foreground">
                                                {policy.rule_type}
                                            </TableCell>
                                            <TableCell className="text-center py-card">
                                                {policy.is_enabled ?
                                                    <Badge className="bg-success-subtle text-success border-none rounded-md font-semibold text-xs px-2 py-0.5">Active</Badge> :
                                                    <Badge className="bg-muted text-muted-foreground border-none rounded-md font-semibold text-xs px-2 py-0.5">Disabled</Badge>
                                                }
                                            </TableCell>
                                            <TableCell className="py-card text-sm font-medium text-muted-foreground">
                                                {new Date(policy.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="py-card text-right pr-card">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => navigate(`/policies/${policy.id}`)}
                                                        className="h-8 rounded-lg px-3 font-semibold text-xs text-secondary border border-border hover:bg-muted"
                                                    >
                                                        <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> View
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </GlassTableRow>
                                    ))
                                )}
                            </TableBody>
                        </GlassTable>
                    </div>
                </GlassCardContent>
            </GlassCard>

            <div className="bg-secondary text-secondary-foreground p-card rounded-xl shadow-sm border border-secondary/20">
                <div className="flex flex-col lg:flex-row items-center gap-card">
                    <div className="p-3 bg-secondary-foreground/10 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div className="space-y-1 flex-1 text-center lg:text-left">
                        <h3 className="text-lg font-bold tracking-tight">Policy enforcement</h3>
                        <p className="text-sm font-medium text-secondary-foreground/80 max-w-2xl">
                            Policies apply after login across active sessions. Use valid JSON to avoid enforcement errors.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/policies')} className="h-9 px-4 rounded-lg border-secondary-foreground/20 bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground font-semibold text-sm">
                            View policies
                        </Button>
                        <Button onClick={() => navigate('/audit')} className="h-9 px-4 rounded-lg bg-secondary-foreground text-secondary font-semibold text-sm shadow-sm">
                            Audit logs
                        </Button>
                    </div>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default Policies;
