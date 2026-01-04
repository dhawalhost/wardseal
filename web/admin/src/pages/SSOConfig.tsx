import { useState, useEffect } from 'react';
import { getSSOProviders, createSSOProvider, updateSSOProvider, deleteSSOProvider, toggleSSOProvider } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';

interface SSOProvider {
    id: string;
    name: string;
    type: 'oidc' | 'saml';
    enabled: boolean;

    // OIDC
    oidc_issuer_url?: string;
    oidc_client_id?: string;
    oidc_client_secret?: string;
    oidc_scopes?: string;

    // SAML
    saml_entity_id?: string;
    saml_sso_url?: string;
    saml_slo_url?: string;
    saml_certificate?: string;
    saml_sign_requests?: boolean;
    saml_sign_assertions?: boolean;

    auto_create_users: boolean;
}

export default function SSOConfig() {
    const [providers, setProviders] = useState<SSOProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProvider, setEditingProvider] = useState<Partial<SSOProvider> | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const res = await getSSOProviders();
            setProviders(res.providers || []);
        } catch (error) {
            console.error('Failed to load providers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProvider) return;

        try {
            if (isCreating) {
                await createSSOProvider(editingProvider);
            } else if (editingProvider.id) {
                await updateSSOProvider(editingProvider.id, editingProvider);
            }
            setEditingProvider(null);
            setIsCreating(false);
            loadProviders();
        } catch (error) {
            console.error('Failed to save provider:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this provider?')) {
            try {
                await deleteSSOProvider(id);
                loadProviders();
            } catch (error) {
                console.error('Failed to delete provider:', error);
            }
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await toggleSSOProvider(id, enabled);
            loadProviders();
        } catch (error) {
            console.error('Failed to toggle provider:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading configurations...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">SSO Configuration</h1>
                {!editingProvider && (
                    <div className="flex gap-2">
                        <Button onClick={() => { setEditingProvider({ type: 'oidc', enabled: true, auto_create_users: true }); setIsCreating(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add OIDC
                        </Button>
                        <Button variant="secondary" onClick={() => { setEditingProvider({ type: 'saml', enabled: true, auto_create_users: true }); setIsCreating(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add SAML
                        </Button>
                    </div>
                )}
            </div>

            {!editingProvider ? (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {providers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-32">
                                            No SSO providers configured. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    providers.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={p.type === 'oidc' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-orange-200 bg-orange-50 text-orange-700'}>
                                                    {p.type.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={p.enabled}
                                                        onCheckedChange={(checked) => handleToggle(p.id, checked)}
                                                    />
                                                    <span className="text-sm text-muted-foreground">{p.enabled ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="icon" variant="ghost" onClick={() => { setEditingProvider(p); setIsCreating(false); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>{isCreating ? 'Add' : 'Edit'} {editingProvider.type?.toUpperCase()} Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form id="sso-form" onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Provider Name</Label>
                                <Input
                                    id="name"
                                    value={editingProvider.name || ''}
                                    onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                                    required
                                    placeholder="e.g. Corporate Okta"
                                />
                            </div>

                            {editingProvider.type === 'oidc' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="issuer">Issuer URL</Label>
                                        <Input
                                            id="issuer"
                                            type="url"
                                            value={editingProvider.oidc_issuer_url || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, oidc_issuer_url: e.target.value })}
                                            required
                                            placeholder="https://dev-xxxx.okta.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="client_id">Client ID</Label>
                                        <Input
                                            id="client_id"
                                            value={editingProvider.oidc_client_id || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, oidc_client_id: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="client_secret">Client Secret {isCreating ? '' : '(Leave blank to keep unchanged)'}</Label>
                                        <Input
                                            id="client_secret"
                                            type="password"
                                            value={editingProvider.oidc_client_secret || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, oidc_client_secret: e.target.value })}
                                            required={isCreating}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="scopes">Scopes</Label>
                                        <Input
                                            id="scopes"
                                            value={editingProvider.oidc_scopes || 'openid profile email'}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, oidc_scopes: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {editingProvider.type === 'saml' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="entity_id">Entity ID</Label>
                                        <Input
                                            id="entity_id"
                                            value={editingProvider.saml_entity_id || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, saml_entity_id: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sso_url">SSO URL</Label>
                                        <Input
                                            id="sso_url"
                                            type="url"
                                            value={editingProvider.saml_sso_url || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, saml_sso_url: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cert">Certificate (PEM)</Label>
                                        <textarea
                                            id="cert"
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={editingProvider.saml_certificate || ''}
                                            onChange={(e) => setEditingProvider({ ...editingProvider, saml_certificate: e.target.value })}
                                            rows={5}
                                            placeholder="-----BEGIN CERTIFICATE-----..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex items-center space-x-2 pt-2">
                                <Switch
                                    id="auto-create"
                                    checked={editingProvider.auto_create_users ?? true}
                                    onCheckedChange={(checked) => setEditingProvider({ ...editingProvider, auto_create_users: checked })}
                                />
                                <Label htmlFor="auto-create">Auto-create users on successful login</Label>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setEditingProvider(null)}>Cancel</Button>
                        <Button type="submit" form="sso-form">Save Configuration</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
