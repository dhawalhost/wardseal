import { useState, useEffect } from 'react';
import { getConnectors, createConnector, updateConnector, deleteConnector, toggleConnector, testConnector } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch'; // Assuming Switch exists or I mock it with a button
import { Loader2, Plus, Plug, Trash2, Check, X, Settings, ArrowLeft, RotateCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

    useEffect(() => {
        loadConnectors();
    }, []);

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
            [field]: { ...editingConnector[field], [key]: value }
        });
    };

    if (loading && connectors.length === 0) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    if (editingConnector) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" size="sm" onClick={() => { setEditingConnector(null); setTestResult(null); }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Connectors
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>{isCreating ? 'Add' : 'Edit'} {editingConnector.type?.toUpperCase()} Connector</CardTitle>
                        <CardDescription>Configure connection details for this identity provider.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Connector Name</Label>
                                <Input
                                    placeholder="e.g. Corporate AD"
                                    value={editingConnector.name || ''}
                                    onChange={(e) => setEditingConnector({ ...editingConnector, name: e.target.value })}
                                    required
                                />
                            </div>

                            <Separator />

                            {/* SCIM Fields */}
                            {editingConnector.type === 'scim' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>SCIM Endpoint URL</Label>
                                        <Input
                                            type="url"
                                            value={editingConnector.endpoint || ''}
                                            onChange={(e) => setEditingConnector({ ...editingConnector, endpoint: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Auth Token (Bearer)</Label>
                                        <Input
                                            type="password"
                                            value={editingConnector.credentials?.token || ''}
                                            onChange={(e) => updateNested('credentials', 'token', e.target.value)}
                                            required={isCreating}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* LDAP Fields */}
                            {editingConnector.type === 'ldap' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>LDAP URL (e.g. ldap://host:389)</Label>
                                        <Input
                                            value={editingConnector.endpoint || ''}
                                            onChange={(e) => setEditingConnector({ ...editingConnector, endpoint: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Bind DN</Label>
                                            <Input
                                                value={editingConnector.credentials?.bind_dn || ''}
                                                onChange={(e) => updateNested('credentials', 'bind_dn', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bind Password</Label>
                                            <Input
                                                type="password"
                                                value={editingConnector.credentials?.bind_password || ''}
                                                onChange={(e) => updateNested('credentials', 'bind_password', e.target.value)}
                                                required={isCreating}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Base DN</Label>
                                        <Input
                                            value={editingConnector.settings?.base_dn || ''}
                                            onChange={(e) => updateNested('settings', 'base_dn', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>User Base DN</Label>
                                            <Input
                                                value={editingConnector.settings?.users_ou || ''}
                                                onChange={(e) => updateNested('settings', 'users_ou', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Group Base DN</Label>
                                            <Input
                                                value={editingConnector.settings?.groups_ou || ''}
                                                onChange={(e) => updateNested('settings', 'groups_ou', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Azure AD Fields */}
                            {editingConnector.type === 'azure-ad' && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
                                        Uses Microsoft Graph API. Ensure your App Registration has proper permissions.
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tenant ID</Label>
                                        <Input
                                            value={editingConnector.credentials?.tenant_id || ''}
                                            onChange={(e) => updateNested('credentials', 'tenant_id', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client ID</Label>
                                        <Input
                                            value={editingConnector.credentials?.client_id || ''}
                                            onChange={(e) => updateNested('credentials', 'client_id', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client Secret</Label>
                                        <Input
                                            type="password"
                                            value={editingConnector.credentials?.client_secret || ''}
                                            onChange={(e) => updateNested('credentials', 'client_secret', e.target.value)}
                                            required={isCreating}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Google Fields */}
                            {editingConnector.type === 'google' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Domain</Label>
                                        <Input
                                            value={editingConnector.settings?.domain || ''}
                                            onChange={(e) => updateNested('settings', 'domain', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Admin Email (for delegation)</Label>
                                        <Input
                                            type="email"
                                            value={editingConnector.credentials?.admin_email || ''}
                                            onChange={(e) => updateNested('credentials', 'admin_email', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Service Account JSON</Label>
                                        <textarea
                                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                            value={editingConnector.credentials?.service_account_json || ''}
                                            onChange={(e) => updateNested('credentials', 'service_account_json', e.target.value)}
                                            required={isCreating}
                                        />
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="flex items-center gap-4">
                                <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
                                    {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                    Test Connection
                                </Button>
                                {testResult && (
                                    <div className={`text-sm flex items-center gap-2 ${testResult.status === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                        {testResult.status === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        {testResult.status === 'success' ? 'Connection Successful' : testResult.error}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setEditingConnector(null)}>Cancel</Button>
                                <Button type="submit">Save Configuration</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Identity Connectors</h1>
                    <p className="text-muted-foreground mt-1">Connect to external identity sources for syncing users and groups.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Button variant="outline" className="h-24 flex flex-col gap-2 items-center justify-center border-dashed border-2 hover:border-primary hover:bg-muted/50" onClick={() => { setEditingConnector({ type: 'scim', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}>
                    <Plug className="h-6 w-6" /> <span className="text-sm">Add SCIM</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 items-center justify-center border-dashed border-2 hover:border-primary hover:bg-muted/50" onClick={() => { setEditingConnector({ type: 'ldap', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}>
                    <div className="font-bold">LDAP</div> <span className="text-sm">Add LDAP / AD</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 items-center justify-center border-dashed border-2 hover:border-primary hover:bg-muted/50" onClick={() => { setEditingConnector({ type: 'azure-ad', enabled: true, credentials: {}, settings: {} }); setIsCreating(true); }}>
                    <div className="font-bold">Azure</div> <span className="text-sm">Add Azure AD</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 items-center justify-center border-dashed border-2 hover:border-primary hover:bg-muted/50" onClick={() => { setEditingConnector({ type: 'google', enabled: true, credentials: {}, settings: { domain: '' } }); setIsCreating(true); }}>
                    <div className="font-bold">Google</div> <span className="text-sm">Add Google Workspace</span>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Connectors</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {connectors.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">No active connectors.</div>
                    ) : (
                        <div className="divide-y">
                            {connectors.map(c => (
                                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-muted rounded-full">
                                            <Plug className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {c.name}
                                                <Badge variant="outline" className="uppercase text-[10px]">{c.type}</Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground truncate max-w-sm">
                                                {c.endpoint || 'Cloud API'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">

                                        {/* Mock Switch since we might not have the component yet, standardizing to small buttons if needed, but Switch is cleaner */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{c.enabled ? 'Enabled' : 'Disabled'}</span>
                                            <Button
                                                variant={c.enabled ? 'default' : 'secondary'}
                                                size="sm"
                                                className={`h-6 w-10 p-0 rounded-full transition-colors ${c.enabled ? 'bg-green-600' : 'bg-muted-foreground/30'}`}
                                                onClick={() => handleToggle(c.id, !c.enabled)}
                                            >
                                                <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${c.enabled ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                            </Button>
                                        </div>

                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingConnector(c); setIsCreating(false); }}>
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
