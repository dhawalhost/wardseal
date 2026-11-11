import { confirmAction } from '@/components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { getSSOProviders, createSSOProvider, updateSSOProvider, deleteSSOProvider, toggleSSOProvider } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Trash2,
    Edit,
    ShieldCheck,
    Lock,
    Fingerprint,
    Activity,
    Terminal,
    X,
    Loader2,
    Building2,
    ChevronRight,
    Search,
    HelpCircle
} from 'lucide-react';
import {
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassCardDescription
} from '@/components/layout';
import { cn } from '@/lib/utils';

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
    saml_encrypt_assertions?: boolean;

    auto_create_users: boolean;
}

export default function SSOConfig() {
    const [providers, setProviders] = useState<SSOProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<Partial<SSOProvider> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            setLoading(true);
            const res = await getSSOProviders();
            const loaded = res.providers || [];
            setProviders(loaded);
            
            // Proactively select the first provider if available and none selected yet
            if (loaded.length > 0 && !selectedProvider) {
                setSelectedProvider(loaded[0]);
                setIsCreating(false);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider) return;

        try {
            setLoading(true);
            if (isCreating) {
                await createSSOProvider(selectedProvider);
            } else if (selectedProvider.id) {
                await updateSSOProvider(selectedProvider.id, selectedProvider);
            }
            setIsCreating(false);
            setIsEditing(false);
            await loadProviders();
        } catch (error) {
            console.error('Failed to save provider:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if ((await confirmAction({ title: "Delete this identity provider?", description: "Users who sign in through it will no longer be able to.", confirmLabel: "Delete provider" }))) {
            try {
                setLoading(true);
                await deleteSSOProvider(id);
                if (selectedProvider?.id === id) {
                    setSelectedProvider(null);
                }
                await loadProviders();
            } catch (error) {
                console.error('Failed to delete provider:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await toggleSSOProvider(id, enabled);
            // Refresh list
            const res = await getSSOProviders();
            const loaded = res.providers || [];
            setProviders(loaded);
            
            // Sync selected provider if it matches
            if (selectedProvider?.id === id) {
                setSelectedProvider(prev => prev ? { ...prev, enabled } : null);
            }
        } catch (error) {
            console.error('Failed to toggle provider:', error);
        }
    };

    const startCreate = (type: 'oidc' | 'saml') => {
        setSelectedProvider({
            type,
            enabled: true,
            auto_create_users: true,
            name: '',
            oidc_scopes: type === 'oidc' ? 'openid profile email' : undefined,
            saml_sign_assertions: type === 'saml' ? true : undefined,
            saml_encrypt_assertions: type === 'saml' ? false : undefined
        });
        setIsCreating(true);
        setIsEditing(true);
    };

    const selectProvider = (p: SSOProvider) => {
        setSelectedProvider(p);
        setIsCreating(false);
        setIsEditing(false);
    };

    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full gap-0 animate-in fade-in duration-300">
            {/* ── Master: Provider List (Left Panel) ───────────────────────────────── */}
            <div className={cn(
                "flex flex-col transition-[color,background-color,border-color,opacity,transform] duration-300 border-r border-border bg-card/10 h-full",
                selectedProvider ? "w-[380px] min-w-[380px]" : "flex-1"
            )}>
                {/* Toolbar */}
                <div className="flex flex-col gap-4 px-6 py-5 border-b border-border bg-card/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-title text-on-surface">Identity providers</h1>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                {providers.length} {providers.length === 1 ? 'provider' : 'providers'} configured
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => startCreate('oidc')} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> OIDC
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => startCreate('saml')} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> SAML
                            </Button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                        <Input
                            placeholder="Search providers"
                            className="h-8 w-full border-none rounded-lg text-xs pl-8 bg-surface-container/40 border border-input focus-visible:ring-ring font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading && providers.length === 0 ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredProviders.length === 0 ? (
                        <div className="py-20 text-center text-xs text-muted-foreground font-medium">
                            No matching providers found
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredProviders.map((p) => {
                                const isSelected = selectedProvider?.id === p.id && !isCreating;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => selectProvider(p)}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-4 cursor-pointer transition-[color,background-color,border-color,opacity,transform] group border-l-2",
                                            isSelected
                                                ? "bg-surface-container-low border-primary"
                                                : "hover:bg-surface-container/40 border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-border",
                                            isSelected ? "bg-primary/10 text-secondary" : "bg-surface-container text-muted-foreground"
                                        )}>
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-[12px] font-medium truncate transition-colors",
                                                isSelected ? "text-secondary" : "text-on-surface group-hover:text-secondary"
                                            )}>
                                                {p.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={cn(
                                                    "text-xs font-medium px-1.5 py-0 rounded border-none shadow-none",
                                                    p.type === 'oidc' ? "bg-primary/10 text-secondary" : "bg-warning-subtle text-warning-subtle-foreground"
                                                )}>
                                                    {p.type}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">•</span>
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    p.enabled ? "text-success" : "text-muted-foreground"
                                                )}>
                                                    {p.enabled ? 'Live' : 'Off'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={cn(
                                            "w-3.5 h-3.5 transition-[color,background-color,border-color,opacity,transform] shrink-0",
                                            isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground"
                                        )} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Detail Panel: Provider Details & Settings (Right Panel) ───────────────── */}
            <div className="flex-1 bg-card/20 flex flex-col h-full overflow-hidden">
                {selectedProvider ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        {/* Header banner */}
                        <div className="bg-surface-container-low px-card py-card text-on-surface shrink-0 relative overflow-hidden border-b border-border">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                <Building2 className="w-32 h-32" />
                            </div>
                            <div className="relative z-10 flex items-start justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-on-surface" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-medium tracking-tight text-on-surface">
                                            {isCreating ? `New ${selectedProvider.type?.toUpperCase()} Federation` : selectedProvider.name}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <Badge className="bg-surface-container-high text-on-surface border-none text-xs font-medium px-2 shadow-none h-5">
                                                {selectedProvider.type}
                                            </Badge>
                                            <span className="text-on-surface">•</span>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={selectedProvider.enabled ?? false}
                                                    disabled={isCreating}
                                                    onCheckedChange={(checked) => handleToggle(selectedProvider.id!, checked)}
                                                    className="h-3.5 w-6 data-[state=checked]:bg-secondary-foreground/40"
                                                />
                                                <span className="text-xs font-medium text-on-surface">
                                                    {selectedProvider.enabled ? 'Live' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {!isCreating && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="h-8 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground font-medium text-xs px-4 border-none shadow-none"
                                        >
                                            {isEditing ? 'View Mode' : 'Edit Configuration'}
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(selectedProvider.id!)}
                                            className="h-8 w-8 rounded-lg bg-secondary-foreground/10 hover:bg-error-subtle text-secondary-foreground hover:text-error flex items-center justify-center p-0 border-none shadow-none"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Configuration Details Form / Viewer */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                            {isEditing ? (
                                <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground ml-1">01 // Identification alias</Label>
                                        <Input
                                            id="name"
                                            value={selectedProvider.name || ''}
                                            onChange={(e) => setSelectedProvider({ ...selectedProvider, name: e.target.value })}
                                            required
                                            className="h-10 border-none rounded-lg bg-surface-container border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-medium px-4 text-sm"
                                            placeholder="e.g. Google Workspace OIDC"
                                        />
                                    </div>

                                    <div className="h-px bg-on-surface/5" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedProvider.type === 'oidc' && (
                                            <>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="issuer" className="text-xs font-medium text-muted-foreground ml-1">02 // OIDC Issuer Discovery Endpoint</Label>
                                                    <div className="relative">
                                                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                                        <Input
                                                            id="issuer"
                                                            type="url"
                                                            value={selectedProvider.oidc_issuer_url || ''}
                                                            onChange={(e) => setSelectedProvider({ ...selectedProvider, oidc_issuer_url: e.target.value })}
                                                            required
                                                            className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-mono text-xs pl-12"
                                                            placeholder="https://accounts.google.com"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="client_id" className="text-xs font-medium text-muted-foreground ml-1">03 // Handshake Client ID</Label>
                                                    <Input
                                                        id="client_id"
                                                        value={selectedProvider.oidc_client_id || ''}
                                                        onChange={(e) => setSelectedProvider({ ...selectedProvider, oidc_client_id: e.target.value })}
                                                        required
                                                        className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-mono text-xs px-4"
                                                        placeholder="OIDC Client ID"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="client_secret" className="text-xs font-medium text-muted-foreground ml-1">04 // Secret Entropy {isCreating ? '' : '(locked)'}</Label>
                                                    <Input
                                                        id="client_secret"
                                                        type="password"
                                                        value={selectedProvider.oidc_client_secret || ''}
                                                        onChange={(e) => setSelectedProvider({ ...selectedProvider, oidc_client_secret: e.target.value })}
                                                        required={isCreating}
                                                        className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] text-xs px-4"
                                                        placeholder={isCreating ? "OIDC Client Secret" : "••••••••••••••••"}
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="scopes" className="text-xs font-medium text-muted-foreground ml-1">05 // Claim Scopes</Label>
                                                    <Input
                                                        id="scopes"
                                                        value={selectedProvider.oidc_scopes || 'openid profile email'}
                                                        onChange={(e) => setSelectedProvider({ ...selectedProvider, oidc_scopes: e.target.value })}
                                                        className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-mono text-xs px-4"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {selectedProvider.type === 'saml' && (
                                            <>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="entity_id" className="text-xs font-medium text-muted-foreground ml-1">02 // SAML Audience Subject Identifier (Entity ID)</Label>
                                                    <Input
                                                        id="entity_id"
                                                        value={selectedProvider.saml_entity_id || ''}
                                                        onChange={(e) => setSelectedProvider({ ...selectedProvider, saml_entity_id: e.target.value })}
                                                        required
                                                        className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-mono text-xs px-4"
                                                        placeholder="SAML Entity ID"
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="sso_url" className="text-xs font-medium text-muted-foreground ml-1">03 // SAML SSO Vector Endpoint URL</Label>
                                                    <div className="relative">
                                                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                                        <Input
                                                            id="sso_url"
                                                            type="url"
                                                            value={selectedProvider.saml_sso_url || ''}
                                                            onChange={(e) => setSelectedProvider({ ...selectedProvider, saml_sso_url: e.target.value })}
                                                            required
                                                            className="h-10 border-none rounded-lg bg-surface-container/30 border border-border focus-visible:ring-2 focus-visible:ring-ring transition-[color,background-color,border-color,opacity,transform] font-mono text-xs pl-12"
                                                            placeholder="https://idp.okta.com/app/sso"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="cert" className="text-xs font-medium text-muted-foreground ml-1">04 // PEM Signature Certification Logic</Label>
                                                    <textarea
                                                        id="cert"
                                                        className="flex min-h-[160px] w-full rounded-lg bg-muted/30 border border-input p-4 font-mono text-xs leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring custom-scrollbar text-on-surface"
                                                        value={selectedProvider.saml_certificate || ''}
                                                        onChange={(e) => setSelectedProvider({ ...selectedProvider, saml_certificate: e.target.value })}
                                                        rows={6}
                                                        placeholder="-----BEGIN CERTIFICATE-----&#10;"
                                                    />
                                                </div>

                                                <div className="flex flex-wrap gap-6 pt-2 md:col-span-2">
                                                    <div className="flex items-center space-x-2.5 group cursor-pointer">
                                                        <Switch
                                                            id="saml-sign-assertions"
                                                            checked={selectedProvider.saml_sign_assertions ?? true}
                                                            onCheckedChange={checked => setSelectedProvider({ ...selectedProvider, saml_sign_assertions: checked })}
                                                            className="h-4 w-7 data-[state=checked]:bg-primary"
                                                        />
                                                        <Label htmlFor="saml-sign-assertions" className="flex items-center gap-1.5 cursor-pointer">
                                                            <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                                                            <span className="text-xs font-medium text-muted-foreground group-hover:text-on-surface transition-colors">Sign assertions</span>
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2.5 group cursor-pointer">
                                                        <Switch
                                                            id="saml-encrypt-assertions"
                                                            checked={selectedProvider.saml_encrypt_assertions ?? false}
                                                            onCheckedChange={checked => setSelectedProvider({ ...selectedProvider, saml_encrypt_assertions: checked })}
                                                            className="h-4 w-7 data-[state=checked]:bg-warning"
                                                        />
                                                        <Label htmlFor="saml-encrypt-assertions" className="flex items-center gap-1.5 cursor-pointer">
                                                            <Lock className="h-3.5 w-3.5 text-warning" />
                                                            <span className="text-xs font-medium text-muted-foreground group-hover:text-on-surface transition-colors">Encrypt assertions</span>
                                                        </Label>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-4 p-4 rounded-lg bg-surface-container-low ring-1 ring-primary/10 border-none shadow-none">
                                        <Switch
                                            id="auto-create"
                                            checked={selectedProvider.auto_create_users ?? true}
                                            onCheckedChange={(checked) => setSelectedProvider({ ...selectedProvider, auto_create_users: checked })}
                                            className="h-4 w-7 data-[state=checked]:bg-primary"
                                        />
                                        <div className="space-y-0.5">
                                            <Label htmlFor="auto-create" className="text-xs font-medium cursor-pointer text-on-surface">Auto-provision Sync Cells</Label>
                                            <p className="text-xs text-muted-foreground">Automatically create users when they sign in via this provider.</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (isCreating) setSelectedProvider(providers[0] || null);
                                                setIsCreating(false);
                                            }}
                                            className="h-9 px-5 rounded-lg font-medium text-xs text-muted-foreground hover:text-on-surface hover:bg-surface-container"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="h-9 rounded-lg font-medium text-sm px-4 shadow-sm bg-secondary text-secondary-foreground"
                                        >
                                            Save Architecture
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-8 max-w-4xl">
                                    {/* Overview Metadata Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <GlassCard className="border border-border shadow-sm bg-card rounded-lg">
                                            <GlassCardContent className="p-5 flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-muted-foreground">Federation Type</span>
                                                <span className="text-lg font-medium text-on-surface">{selectedProvider.type}</span>
                                            </GlassCardContent>
                                        </GlassCard>
                                        <GlassCard className="border border-border shadow-sm bg-card rounded-lg">
                                            <GlassCardContent className="p-5 flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-muted-foreground">Handshake Provisioning</span>
                                                <span className="text-lg font-medium text-on-surface">{selectedProvider.auto_create_users ? 'Auto-Sync' : 'Explicit-Only'}</span>
                                            </GlassCardContent>
                                        </GlassCard>
                                        <GlassCard className="border border-border shadow-sm bg-card rounded-lg">
                                            <GlassCardContent className="p-5 flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-muted-foreground">Tunnel Health State</span>
                                                <span className={cn(
                                                    "text-lg font-medium",
                                                    selectedProvider.enabled ? "text-success" : "text-muted-foreground"
                                                )}>
                                                    {selectedProvider.enabled ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </GlassCardContent>
                                        </GlassCard>
                                    </div>

                                    {/* Parameters List */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-medium text-muted-foreground">SSO Configuration Matrix</h3>
                                        <GlassCard className="border border-border shadow-sm bg-card rounded-lg divide-y divide-border">
                                            {selectedProvider.type === 'oidc' ? (
                                                <>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">OIDC issuer URL</span>
                                                        <span className="font-mono text-xs text-secondary truncate">{selectedProvider.oidc_issuer_url}</span>
                                                    </div>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">Client ID Primitives</span>
                                                        <span className="font-mono text-xs text-on-surface truncate">{selectedProvider.oidc_client_id}</span>
                                                    </div>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">Authorized Sync Scopes</span>
                                                        <span className="font-mono text-xs text-on-surface-variant">{selectedProvider.oidc_scopes}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">SAML audience entity ID</span>
                                                        <span className="font-mono text-xs text-on-surface truncate">{selectedProvider.saml_entity_id}</span>
                                                    </div>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">SAML SSO endpoint</span>
                                                        <span className="font-mono text-xs text-secondary truncate">{selectedProvider.saml_sso_url}</span>
                                                    </div>
                                                    <div className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs font-medium text-muted-foreground">Cryptographic Options</span>
                                                        <div className="flex gap-4 mt-1">
                                                            <Badge className="bg-surface-container-high text-on-surface-variant border border-secondary/20 shadow-none text-xs font-medium">
                                                                Sign assertions: {selectedProvider.saml_sign_assertions ? 'Yes' : 'No'}
                                                            </Badge>
                                                            <Badge className="bg-warning-subtle text-warning-subtle-foreground border border-warning/30 shadow-none text-xs font-medium">
                                                                Encrypt assertions: {selectedProvider.saml_encrypt_assertions ? 'Yes' : 'No'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {selectedProvider.saml_certificate && (
                                                        <div className="p-5 flex flex-col gap-2">
                                                            <span className="text-xs font-medium text-muted-foreground">Sign Certification PEM block</span>
                                                            <pre className="p-4 rounded-lg bg-surface-container/30 text-xs font-mono leading-relaxed overflow-x-auto text-on-surface-variant max-h-48 custom-scrollbar">
                                                                {selectedProvider.saml_certificate}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </GlassCard>
                                    </div>

                                    {/* Dynamic Integration Guides */}
                                    <div className="p-6 rounded-lg bg-surface-container/30 border border-border flex gap-4">
                                        <div className="p-2.5 bg-surface-container-high text-on-surface-variant rounded-lg self-start">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[12px] font-medium tracking-tight text-on-surface">Integrating with your Identity Provider</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-medium">
                                                To successfully establish single sign-on, you must configure this platform as an authorized application in your identity provider dashboard (e.g. Okta, Auth0, Microsoft Entra ID). Set your provider redirect or ACS URL endpoints to point to your tenant slug gateway.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                        <div className="w-20 h-20 bg-surface-container/40 rounded-lg flex items-center justify-center mb-6">
                            <Building2 className="w-10 h-10 opacity-30 text-on-surface-variant" />
                        </div>
                        <h3 className="text-base font-medium text-muted-foreground mb-2">No provider selected</h3>
                        <p className="text-sm font-medium max-w-xs leading-relaxed text-muted-foreground">Select a provider from the list or create a new OIDC or SAML connector.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
