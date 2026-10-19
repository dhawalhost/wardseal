import React, { useState, useEffect } from 'react';
import { getConnectors, createConnector, updateConnector, deleteConnector, toggleConnector, testConnector } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Plug, Trash2, Check, X, Settings, ArrowLeft, RotateCcw, Link2, ExternalLink, ShieldCheck, Database } from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, PageLayout
} from '@/components/layout';

interface ConnectorConfig {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    endpoint: string;
    credentials: Record<string, string>;
    settings: Record<string, string>;
}

export default function Connectors() {
    const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingConnector, setEditingConnector] = useState<Partial<ConnectorConfig> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [testResult, setTestResult] = useState<{ status: string; error?: string } | null>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => { loadConnectors(); }, []);

    const loadConnectors = async () => {
        try {
            const res = await getConnectors();
            setConnectors(res.connectors || []);
        } catch (error) {
            console.error('Failed to load connectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingConnector) return;

        try {
            if (isCreating) {
                await createConnector(editingConnector);
            } else if (editingConnector.id) {
                await updateConnector(editingConnector.id, editingConnector);
            }
            setEditingConnector(null);
            setIsCreating(false);
            setTestResult(null);
            loadConnectors();
        } catch (error) {
            console.error('Failed to save connector:', error);
            alert('Failed to save: ' + (error as any).message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this connector?')) {
            try {
                await deleteConnector(id);
                loadConnectors();
            } catch (error) {
                console.error('Failed to delete connector:', error);
            }
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await toggleConnector(id, enabled);
            loadConnectors();
        } catch (error) {
            console.error('Failed to toggle connector:', error);
        }
    };

    const handleTest = async () => {
        if (!editingConnector) return;
        setTesting(true);
        setTestResult(null);
        try {
            await testConnector(editingConnector);
            setTestResult({ status: 'success' });
        } catch (error: any) {
            console.error('Test failed:', error);
            setTestResult({ status: 'failed', error: error.response?.data?.error || error.message });
        } finally {
            setTesting(false);
        }
    };

    const updateNested = (field: 'credentials' | 'settings', key: string, value: string) => {
        if (!editingConnector) return;
        setEditingConnector({
            ...editingConnector,
            [field]: { ...(editingConnector[field] || {}), [key]: value }
        });
    };

    const inputClass = "h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium px-4 text-sm";

    if (loading && connectors.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    if (editingConnector) {
        return (
            <PageLayout>
            <div className="space-y-page animate-in fade-in duration-300">
                <PageHeader
                    icon={<Plug className="w-6 h-6 text-secondary" />}
                    title={isCreating ? 'Add connector' : 'Edit connector'}
                    description="Configure how WardSeal syncs data with your external provider."
                    actions={
                        <Button
                            variant="outline"
                            onClick={() => { setEditingConnector(null); setTestResult(null); }}
                            className="bg-card rounded-lg font-semibold text-sm h-9 px-4 border-border shadow-sm"
                        >
                            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Cancel
                        </Button>
                    }
                />

                <div className="flex justify-center">
                    <GlassCard className="w-full max-w-4xl border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary rounded-lg text-secondary-foreground shadow-sm">
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">
                                        {editingConnector.type ? editingConnector.type.charAt(0).toUpperCase() + editingConnector.type.slice(1).toLowerCase() : 'Generic'} connector
                                    </GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Sync users and groups from your external directory.</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card space-y-4">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Connection name</Label>
                                    <Input
                                        placeholder="e.g., Corporate LDAP"
                                        value={editingConnector.name || ''}
                                        onChange={(e) => setEditingConnector({ ...editingConnector, name: e.target.value })}
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                <div className="h-px bg-border" />

                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Credentials</h3>

                                    {editingConnector.type === 'scim' && (
                                        <div className="grid gap-card">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Endpoint URL</Label>
                                                <Input
                                                    type="url"
                                                    placeholder="https://scim.identity.provider/v2"
                                                    value={editingConnector.endpoint || ''}
                                                    onChange={(e) => setEditingConnector({ ...editingConnector, endpoint: e.target.value })}
                                                    required
                                                    className={`${inputClass} font-mono text-xs`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Bearer token</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••••••••••"
                                                    value={editingConnector.credentials?.token || ''}
                                                    onChange={(e) => updateNested('credentials', 'token', e.target.value)}
                                                    required={isCreating}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {editingConnector.type === 'ldap' && (
                                        <div className="grid gap-card">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Server URL</Label>
                                                <Input
                                                    placeholder="ldaps://identity.corp:636"
                                                    value={editingConnector.endpoint || ''}
                                                    onChange={(e) => setEditingConnector({ ...editingConnector, endpoint: e.target.value })}
                                                    required
                                                    className={`${inputClass} font-mono text-xs`}
                                                />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-card">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Bind DN</Label>
                                                    <Input
                                                        placeholder="cn=admin,dc=corp,dc=com"
                                                        value={editingConnector.credentials?.bind_dn || ''}
                                                        onChange={(e) => updateNested('credentials', 'bind_dn', e.target.value)}
                                                        required
                                                        className={`${inputClass} font-mono text-xs`}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Bind password</Label>
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={editingConnector.credentials?.bind_password || ''}
                                                        onChange={(e) => updateNested('credentials', 'bind_password', e.target.value)}
                                                        required={isCreating}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Base DN</Label>
                                                <Input
                                                    placeholder="dc=corp,dc=com"
                                                    value={editingConnector.settings?.base_dn || ''}
                                                    onChange={(e) => updateNested('settings', 'base_dn', e.target.value)}
                                                    required
                                                    className={`${inputClass} font-mono text-xs`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {editingConnector.type === 'azure-ad' && (
                                        <div className="grid gap-card">
                                            <div className="p-card rounded-xl bg-secondary/5 text-secondary border border-border flex items-start gap-3 text-sm font-medium leading-relaxed">
                                                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                This connection uses Microsoft Graph API. Ensure the app registration has Directory.Read.All permissions in Entra ID.
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Tenant ID</Label>
                                                <Input
                                                    placeholder="00000000-0000-0000-0000-000000000000"
                                                    value={editingConnector.credentials?.tenant_id || ''}
                                                    onChange={(e) => updateNested('credentials', 'tenant_id', e.target.value)}
                                                    required
                                                    className={`${inputClass} font-mono text-xs`}
                                                />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-card">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Client ID</Label>
                                                    <Input
                                                        placeholder="00000000-0000-0000-0000-000000000000"
                                                        value={editingConnector.credentials?.client_id || ''}
                                                        onChange={(e) => updateNested('credentials', 'client_id', e.target.value)}
                                                        required
                                                        className={`${inputClass} font-mono text-xs`}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Client secret</Label>
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={editingConnector.credentials?.client_secret || ''}
                                                        onChange={(e) => updateNested('credentials', 'client_secret', e.target.value)}
                                                        required={isCreating}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editingConnector.type === 'google' && (
                                        <div className="grid gap-card">
                                            <div className="grid md:grid-cols-2 gap-card">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Workspace domain</Label>
                                                    <Input
                                                        placeholder="acme.com"
                                                        value={editingConnector.settings?.domain || ''}
                                                        onChange={(e) => updateNested('settings', 'domain', e.target.value)}
                                                        required
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Admin email</Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="admin@acme.com"
                                                        value={editingConnector.credentials?.admin_email || ''}
                                                        onChange={(e) => updateNested('credentials', 'admin_email', e.target.value)}
                                                        required
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Service account key (JSON)</Label>
                                                <textarea
                                                    className="flex min-h-[150px] w-full border border-border rounded-xl bg-card p-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-secondary/20 text-on-surface"
                                                    placeholder='{ "type": "service_account", ... }'
                                                    value={editingConnector.credentials?.service_account_json || ''}
                                                    onChange={(e) => updateNested('credentials', 'service_account_json', e.target.value)}
                                                    required={isCreating}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-border" />

                                <div className="flex flex-col md:flex-row items-center gap-card">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTest}
                                        disabled={testing}
                                        className="h-9 w-full md:w-auto px-4 rounded-lg border-border font-semibold text-sm"
                                    >
                                        {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                                        Test connection
                                    </Button>

                                    {testResult && (
                                        <div className={`p-3 rounded-lg border flex items-center gap-3 flex-1 ${testResult.status === 'success' ? 'bg-success-subtle border-success/20 text-success' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
                                            {testResult.status === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold leading-none">{testResult.status === 'success' ? 'Test successful' : 'Test failed'}</span>
                                                {testResult.error && <span className="text-xs font-medium text-muted-foreground mt-1 truncate max-w-md">{testResult.error}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setEditingConnector(null)}
                                        className="h-9 px-4 rounded-lg font-semibold text-sm text-muted-foreground"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-6 shadow-sm"
                                    >
                                        Save configuration
                                    </Button>
                                </div>
                            </form>
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Plug className="w-6 h-6 text-secondary" />}
                title="Connectors"
                description="Connect your identity providers to sync users automatically."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card">
                <Button
                    variant="outline"
                    className="h-28 flex flex-col gap-2 items-center justify-center border border-border bg-card hover:bg-muted/50 rounded-xl group transition-colors shadow-sm"
                    onClick={() => { setEditingConnector({ type: 'scim', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}
                >
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                        <Plug className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold tracking-tight text-on-surface">Add SCIM</span>
                        <span className="text-xs font-medium text-muted-foreground">Standard API sync</span>
                    </div>
                </Button>
                <Button
                    variant="outline"
                    className="h-28 flex flex-col gap-2 items-center justify-center border border-border bg-card hover:bg-muted/50 rounded-xl group transition-colors shadow-sm"
                    onClick={() => { setEditingConnector({ type: 'ldap', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}
                >
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                        <Database className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold tracking-tight text-on-surface">Add LDAP</span>
                        <span className="text-xs font-medium text-muted-foreground">On-premise directory</span>
                    </div>
                </Button>
                <Button
                    variant="outline"
                    className="h-28 flex flex-col gap-2 items-center justify-center border border-border bg-card hover:bg-muted/50 rounded-xl group transition-colors shadow-sm"
                    onClick={() => { setEditingConnector({ type: 'azure-ad', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}
                >
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold tracking-tight text-on-surface">Add Entra ID</span>
                        <span className="text-xs font-medium text-muted-foreground">Microsoft cloud</span>
                    </div>
                </Button>
                <Button
                    variant="outline"
                    className="h-28 flex flex-col gap-2 items-center justify-center border border-border bg-card hover:bg-muted/50 rounded-xl group transition-colors shadow-sm"
                    onClick={() => { setEditingConnector({ type: 'google', enabled: true, credentials: {}, settings: { domain: '' } }); setIsCreating(true); }}
                >
                    <div className="p-2 bg-secondary/10 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                        <Link2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold tracking-tight text-on-surface">Add Google</span>
                        <span className="text-xs font-medium text-muted-foreground">Google Workspace</span>
                    </div>
                </Button>
            </div>

            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Link2 className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Configured sources ({connectors.length})</GlassCardTitle>
                            <p className="text-muted-foreground text-sm mt-0.5">Identity sources syncing with WardSeal</p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    {connectors.length === 0 ? (
                        <div className="py-16 text-center text-sm font-medium text-muted-foreground">No sync sources configured.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {connectors.map(c => (
                                <div key={c.id} className="p-card flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-muted/50 transition-colors group gap-card">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                                            <Plug className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold tracking-tight text-on-surface">{c.name}</span>
                                                <Badge className="bg-muted text-muted-foreground border-none rounded-md font-semibold text-[10px] px-2 py-0.5">{c.type}</Badge>
                                            </div>
                                            <div className="text-xs font-medium text-muted-foreground">
                                                {c.endpoint || 'Internal'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-card w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-border">
                                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                                            <Switch
                                                checked={c.enabled}
                                                onCheckedChange={(checked) => handleToggle(c.id, checked)}
                                                className="data-[state=checked]:bg-success"
                                            />
                                            <span className={`text-xs font-semibold ${c.enabled ? 'text-success' : 'text-muted-foreground'}`}>
                                                {c.enabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>

                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-on-surface hover:bg-muted" onClick={() => { setEditingConnector(c); setIsCreating(false); }}>
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCardContent>
            </GlassCard>
        </div>
        </PageLayout>
    );
}
