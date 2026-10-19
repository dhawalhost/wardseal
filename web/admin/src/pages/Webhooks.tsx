import React, { useEffect, useState } from 'react';
import { getWebhooks, createWebhook, deleteWebhook } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableBody } from '@/components/ui/table';
import {
    Loader2,
    Plus,
    Webhook as WebhookIcon,
    Check,
    Activity,
    Globe,
    ShieldCheck,
    Lock
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { WebhookTableRow } from '../components/WebhookTableRow';


interface Webhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
}

const Webhooks: React.FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const availableEvents = ['user.created', 'user.deleted', 'access.requested', 'access.approved'];

    const fetchData = async () => {
        try {
            const data = await getWebhooks();
            if (data && data.webhooks) {
                setWebhooks(data.webhooks);
            } else if (Array.isArray(data)) {
                setWebhooks(data);
            } else {
                setWebhooks([]);
            }
        } catch (err) {
            console.error("Failed to fetch webhooks", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        if (!newUrl) {
            setError('URL is required');
            return;
        }
        if (selectedEvents.length === 0) {
            setError('Select at least one event');
            return;
        }
        setCreating(true);
        try {
            await createWebhook(newUrl, selectedEvents);
            setNewUrl('');
            setSelectedEvents([]);
            setError('');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create webhook');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this webhook?")) return;
        try {
            await deleteWebhook(id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleEvent = (e: string) => {
        if (selectedEvents.includes(e)) {
            setSelectedEvents(selectedEvents.filter(ev => ev !== e));
        } else {
            setSelectedEvents([...selectedEvents, e]);
        }
    };

    if (loading && webhooks.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<WebhookIcon className="w-6 h-6 text-secondary" />}
                title="Webhooks"
                description="Send outbound notifications when identity and access events occur."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card items-start">
                <div className="lg:col-span-4 space-y-page">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="border-b border-border py-card px-card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary rounded-lg text-secondary-foreground shadow-sm">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Add webhook</GlassCardTitle>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Endpoint URL</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <Globe className="h-4 w-4" />
                                    </div>
                                    <Input
                                        placeholder="https://api.example.com/hooks"
                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-mono text-xs pl-10"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Events</Label>
                                <div className="grid grid-cols-1 gap-2 bg-muted/50 rounded-xl p-card border border-border">
                                    {availableEvents.map(ev => (
                                        <div key={ev} className="flex items-center space-x-3 group cursor-pointer select-none" onClick={() => toggleEvent(ev)}>
                                            <div
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedEvents.includes(ev) ? 'bg-secondary border-secondary' : 'border-border bg-card group-hover:border-secondary/50'}`}
                                            >
                                                {selectedEvents.includes(ev) && <Check className="h-3 w-3 text-secondary-foreground" />}
                                            </div>
                                            <span className={`text-sm font-medium transition-colors ${selectedEvents.includes(ev) ? 'text-on-surface' : 'text-muted-foreground'}`}>{ev}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="bg-destructive/5 text-destructive p-3 rounded-lg border border-destructive/20 font-semibold text-sm">
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleCreate}
                                className="w-full h-10 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm"
                                disabled={creating}
                            >
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Create webhook
                            </Button>
                        </GlassCardContent>
                    </GlassCard>

                    <div className="bg-muted/50 p-card rounded-xl border border-border flex items-start gap-3">
                        <div className="p-2 bg-card rounded-lg shadow-sm border border-border">
                            <Lock className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-on-surface">Signed deliveries</h4>
                            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                                Outbound webhooks are signed with HMAC-SHA256 for integrity verification.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <ShieldCheck className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Configured webhooks</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">{webhooks.length} endpoints</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-0">
                            {webhooks.length === 0 ? (
                                <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                                        <WebhookIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <span className="max-w-xs font-medium text-sm">No webhooks configured yet.</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <GlassTable>
                                        <GlassTableHeader>
                                            <GlassTableRow className="hover:bg-transparent border-b border-border">
                                                <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Endpoint</GlassTableHead>
                                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Events</GlassTableHead>
                                                <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                                <GlassTableHead className="text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                            </GlassTableRow>
                                        </GlassTableHeader>
                                        <TableBody>
                                            {webhooks.map(wh => (
                                                <WebhookTableRow
                                                    key={wh.id}
                                                    webhook={wh}
                                                    handleDelete={handleDelete}
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
        </div>
        </PageLayout>
    );
};

export default Webhooks;
