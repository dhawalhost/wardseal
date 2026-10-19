import React, { useState, useEffect } from 'react';
import { getSlackStatus, configureSlack, disconnectSlack, SlackIntegration as SlackIntegType } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Slack, 
    ShieldCheck, 
    ShieldAlert, 
    Loader2, 
    ExternalLink, 
    RefreshCcw, 
    Trash2,
    Lock,
    Webhook,
    Zap,
    MessageSquare,
    Activity,
    Terminal,
    Hash,
    Monitor,
    Command,
    Layout
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardFooter, PageLayout
} from '@/components/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SlackIntegration: React.FC = () => {
    const [status, setStatus] = useState<SlackIntegType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [form, setForm] = useState({
        team_id: '',
        app_id: '',
        bot_token: '',
        signing_secret: '',
        webhook_url: '',
        enabled: true
    });

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await getSlackStatus();
            setStatus(data);
            if (data.status === 'ready') {
                setForm({
                    team_id: data.team_id || '',
                    app_id: data.app_id || '',
                    bot_token: '', 
                    signing_secret: '', 
                    webhook_url: data.webhook_url || '',
                    enabled: data.enabled
                });
            }
        } catch (err: any) {
            console.error('Failed to fetch Slack status', err);
            setError('Could not retrieve Slack integration status.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await configureSlack(form);
            setSuccess('Slack integration successfully configured.');
            fetchStatus();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update Slack configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect Slack? This will disable all ChatOps functionality.')) return;
        setLoading(true);
        try {
            await disconnectSlack();
            setSuccess('Slack workspace disconnected.');
            fetchStatus();
        } catch (err) {
            setError('Failed to disconnect Slack.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !status) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;

    const isConfigured = status?.status === 'ready';

    return (
        <PageLayout>
        <div className="max-w-6xl mx-auto space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Slack className="w-6 h-6 text-[#4A154B]" />}
                title="Slack Integration"
                description="Connect Slack for identity alerts, access requests, and ChatOps commands."
                actions={
                    isConfigured && (
                        <Badge className="bg-success-subtle text-success border-none rounded-md font-semibold text-xs px-3 py-1.5 flex items-center gap-2 shadow-none">
                            <ShieldCheck className="w-4 h-4" />
                            Connected
                        </Badge>
                    )
                }
            />

             {(error || success) && (
                <div className="space-y-3">
                    {error && (
                        <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                            <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                                <ShieldAlert className="w-4 h-4" />
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    {success && (
                        <Alert className="rounded-lg border border-success/20 bg-success-subtle text-success">
                            <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4" />
                                {success}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card">
                <div className="lg:col-span-4 space-y-page">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Connection status</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Current Slack workspace</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card flex flex-col items-center text-center space-y-6">
                            {isConfigured ? (
                                <>
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-lg bg-[#4A154B]/10 flex items-center justify-center">
                                            <Slack className="w-10 h-10 text-[#4A154B]" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border border-border rounded-lg shadow-sm flex items-center justify-center">
                                            <Activity className="w-4 h-4 text-success" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg tracking-tight text-on-surface">Connected</h3>
                                        <div className="flex flex-col gap-1 pt-1">
                                            <code className="text-xs font-medium text-muted-foreground">Team: {status?.team_id}</code>
                                            <code className="text-xs font-medium text-muted-foreground">App: {status?.app_id}</code>
                                        </div>
                                    </div>
                                    <div className="w-full space-y-3 pt-2">
                                        <Button 
                                            variant="outline" 
                                            className="w-full h-10 rounded-lg border border-border font-semibold text-sm hover:bg-muted/50 shadow-sm" 
                                            onClick={fetchStatus}
                                        >
                                            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh status
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="w-full h-10 text-destructive font-semibold text-sm hover:bg-destructive/10 hover:text-destructive rounded-lg" 
                                            onClick={handleDisconnect}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Disconnect
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                                        <Slack className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-[220px]">
                                            No Slack workspace connected yet.
                                        </p>
                                        <Button variant="outline" className="h-10 rounded-lg border border-border font-semibold text-sm px-4" asChild>
                                            <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer">
                                                <ExternalLink className="w-4 h-4 mr-2" /> Slack API portal
                                            </a>
                                        </Button>
                                    </div>
                                </>
                            )}
                        </GlassCardContent>
                    </GlassCard>

                    <div className="bg-secondary text-secondary-foreground p-card rounded-lg flex items-start gap-4 shadow-sm border border-secondary/20">
                        <Activity className="w-5 h-5 text-secondary-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium leading-relaxed text-secondary-foreground/80">
                            Events are delivered over secure webhooks so identity actions stay in sync with Slack.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                                    <Layout className="w-4 h-4" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Configuration</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Slack app credentials and endpoints</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <form onSubmit={handleSave}>
                            <GlassCardContent className="p-card space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                            <Hash className="w-3.5 h-3.5" />
                                            Team ID
                                        </Label>
                                        <Input 
                                            placeholder="e.g. T0123ABC"
                                            className="h-11 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium text-sm font-mono"
                                            value={form.team_id}
                                            onChange={e => setForm({...form, team_id: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                            <Monitor className="w-3.5 h-3.5" />
                                            App ID
                                        </Label>
                                        <Input 
                                            placeholder="e.g. A0123XYZ"
                                            className="h-11 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium text-sm font-mono"
                                            value={form.app_id}
                                            onChange={e => setForm({...form, app_id: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5" />
                                        Bot user token (OAuth)
                                    </Label>
                                    <Input 
                                        type="password"
                                        placeholder={isConfigured ? "••••••••••••••••" : "xoxb-xxxx-xxxx-xxxx"}
                                        className="h-11 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium text-sm"
                                        value={form.bot_token}
                                        onChange={e => setForm({...form, bot_token: e.target.value})}
                                        required={!isConfigured}
                                    />
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Tokens are encrypted at rest and never shown again after save.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Signing secret
                                    </Label>
                                    <Input 
                                        type="password"
                                        placeholder={isConfigured ? "••••••••••••••••" : "Signing secret from Slack"}
                                        className="h-11 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium text-sm"
                                        value={form.signing_secret}
                                        onChange={e => setForm({...form, signing_secret: e.target.value})}
                                        required={!isConfigured}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                        <Webhook className="w-3.5 h-3.5" />
                                        Incoming webhook URL
                                    </Label>
                                    <Input 
                                        placeholder="https://hooks.slack.com/services/..."
                                        className="h-11 rounded-lg border border-border bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium text-sm font-mono"
                                        value={form.webhook_url}
                                        onChange={e => setForm({...form, webhook_url: e.target.value})}
                                    />
                                </div>
                            </GlassCardContent>
                            <GlassCardFooter className="py-card px-card border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${form.enabled ? 'bg-success' : 'bg-muted-foreground'}`} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-on-surface">{form.enabled ? 'Enabled' : 'Disabled'}</span>
                                        <span className="text-xs font-medium text-muted-foreground">Integration state</span>
                                    </div>
                                </div>
                                <Button type="submit" disabled={saving} className="h-11 rounded-lg font-semibold text-sm px-6 bg-secondary text-secondary-foreground shadow-sm w-full md:w-auto">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save configuration'}
                                </Button>
                            </GlassCardFooter>
                        </form>
                    </GlassCard>
                </div>
            </div>

            <GlassCard className="border border-secondary/20 shadow-sm bg-secondary text-secondary-foreground overflow-hidden rounded-lg p-card">
                <div className="flex flex-col lg:flex-row items-start gap-card">
                    <div className="p-3 bg-secondary-foreground/10 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight">Slash command endpoint</h3>
                            <p className="text-sm font-medium text-secondary-foreground/80 leading-relaxed max-w-2xl">
                                Point your Slack app&apos;s slash commands to this URL.
                            </p>
                        </div>
                        
                        <div className="bg-secondary-foreground/10 p-4 rounded-lg border border-secondary-foreground/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary-foreground/10 rounded-lg">
                                    <Terminal className="h-4 w-4 text-secondary-foreground" />
                                </div>
                                <code className="font-mono text-sm font-semibold text-secondary-foreground select-all break-all">
                                    {window.location.origin}/integrations/slack/commands
                                </code>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {['/wardseal-whoami', '/wardseal-lock', '/wardseal-audit'].map(cmd => (
                                <div key={cmd} className="flex items-center gap-3 py-3 px-4 rounded-lg bg-secondary-foreground/5 border border-secondary-foreground/10">
                                    <Command className="h-4 w-4 text-secondary-foreground/80" />
                                    <span className="font-mono text-xs font-semibold text-secondary-foreground">{cmd}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
        </PageLayout>
    );
};

export default SlackIntegration;
