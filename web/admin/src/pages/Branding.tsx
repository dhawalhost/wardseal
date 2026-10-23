import React, { useState, useEffect } from 'react';
import { getBranding, updateBranding, BrandingConfig } from '../api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Palette, RefreshCw, LayoutTemplate } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, PageLayout
} from '@/components/layout';

const Branding: React.FC = () => {
    const [config, setConfig] = useState<BrandingConfig>({
        tenant_id: '',
        logo_url: '/wardseal.svg',
        primary_color: '#0369A1',
        background_color: '#F8FAFC',
        css_override: '',
        config: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadBranding();
    }, []);

    const loadBranding = async () => {
        try {
            const data = await getBranding();
            setConfig(prev => ({
                ...data,
                primary_color: data.primary_color || prev.primary_color,
                background_color: data.background_color || prev.background_color,
                logo_url: data.logo_url || prev.logo_url
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            await updateBranding(config);
            setSuccess('Branding updated successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError('Failed to update branding');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Palette className="w-6 h-6 text-secondary" />}
                title="Branding"
                description="Customize the design of your login page and user portal."
                actions={
                    <Button
                        variant="outline"
                        onClick={loadBranding}
                        className="h-9 rounded-lg bg-card border border-border font-semibold text-sm px-4 shadow-sm"
                    >
                        <RefreshCw className="h-4 w-4 mr-1.5" /> Reset
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card items-start">
                <div className="lg:col-span-5 space-y-page">
                    <GlassCard className="border border-border shadow-sm rounded-xl bg-card">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary rounded-lg text-secondary-foreground shadow-sm">
                                    <LayoutTemplate className="w-4 h-4" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Design settings</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Configure brand colors and logo.</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card">
                            <form id="branding-form" onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="logo" className="text-xs font-semibold tracking-wide text-muted-foreground">
                                        Logo URL
                                    </Label>
                                    <Input
                                        id="logo"
                                        type="url"
                                        value={config.logo_url}
                                        onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                                        placeholder="https://your-domain.com/logo.svg"
                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium text-sm px-4"
                                    />
                                    <p className="text-xs font-medium text-muted-foreground">Recommended: SVG or PNG with a transparent background.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-card">
                                    <div className="space-y-2">
                                        <Label htmlFor="primary" className="text-xs font-semibold tracking-wide text-muted-foreground">Primary color</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="primary"
                                                type="color"
                                                value={config.primary_color}
                                                onChange={e => setConfig({ ...config, primary_color: e.target.value })}
                                                className="w-10 h-10 p-1 rounded-lg cursor-pointer border border-border bg-card shadow-sm"
                                            />
                                            <Input
                                                value={config.primary_color}
                                                onChange={e => setConfig({ ...config, primary_color: e.target.value })}
                                                className="uppercase font-mono text-xs font-semibold h-10 rounded-lg border border-border bg-card px-3"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bg" className="text-xs font-semibold tracking-wide text-muted-foreground">Background</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="bg"
                                                type="color"
                                                value={config.background_color}
                                                onChange={e => setConfig({ ...config, background_color: e.target.value })}
                                                className="w-10 h-10 p-1 rounded-lg cursor-pointer border border-border bg-card shadow-sm"
                                            />
                                            <Input
                                                value={config.background_color}
                                                onChange={e => setConfig({ ...config, background_color: e.target.value })}
                                                className="uppercase font-mono text-xs font-semibold h-10 rounded-lg border border-border bg-card px-3"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="css" className="text-xs font-semibold tracking-wide text-muted-foreground">Custom CSS</Label>
                                    <Textarea
                                        id="css"
                                        value={config.css_override}
                                        onChange={e => setConfig({ ...config, css_override: e.target.value })}
                                        rows={8}
                                        placeholder=".login-card { border: 2px solid var(--primary); }"
                                        className="flex min-h-[160px] w-full border border-border rounded-xl bg-card p-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-secondary/20 text-on-surface"
                                    />
                                    <p className="text-xs font-medium text-muted-foreground">Optional CSS to further customize the login experience.</p>
                                </div>

                                <div className="pt-2">
                                    {error && (
                                        <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/20 mb-3">
                                            {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="flex items-center gap-2 text-sm font-semibold text-success bg-success-subtle p-3 rounded-lg border border-success/20 mb-3">
                                            {success}
                                        </div>
                                    )}
                                    <Button
                                        type="submit"
                                        form="branding-form"
                                        disabled={saving}
                                        className="w-full h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm"
                                    >
                                        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                                        Save branding
                                    </Button>
                                </div>
                            </form>
                        </GlassCardContent>
                    </GlassCard>
                </div>

                <div className="lg:col-span-7 lg:sticky lg:top-8">
                    <GlassCard className="border border-border shadow-sm flex flex-col h-full overflow-hidden rounded-xl bg-card">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Preview</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">How your login page will look to users.</p>
                                </div>
                                <Badge className="bg-success-subtle text-success border-none rounded-md font-semibold text-[10px] px-2 py-0.5">Live preview</Badge>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-0 bg-muted/30">
                            <div
                                className="h-[560px] w-full flex items-center justify-center p-card transition-colors duration-300"
                                style={{ backgroundColor: config.background_color }}
                            >
                                <div className="w-full max-w-[360px] bg-card rounded-xl border border-border p-card relative z-10 shadow-sm">
                                    <div className="text-center mb-8">
                                        {config.logo_url ? (
                                            <img src={config.logo_url} alt="Logo" className="mx-auto h-10 min-w-[48px] mb-4 object-contain" />
                                        ) : (
                                            <div className="mx-auto h-10 w-10 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                                                <Palette className="h-5 w-5 text-secondary" />
                                            </div>
                                        )}
                                        <h2 className="text-xl font-bold text-on-surface tracking-tight">Sign in</h2>
                                        <p className="text-sm font-medium text-muted-foreground mt-2">Secure access to your account</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground">Email</label>
                                            <div className="h-10 w-full rounded-lg bg-muted/50 border border-border px-4 py-2 text-sm text-on-surface font-medium flex items-center select-none">
                                                admin@wardseal.io
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end">
                                                <label className="text-xs font-semibold text-muted-foreground">Password</label>
                                                <span className="text-xs font-semibold text-secondary cursor-pointer">Forgot password?</span>
                                            </div>
                                            <div className="h-10 w-full rounded-lg bg-muted/50 border border-border px-4 py-2 flex items-center">
                                                <div className="flex gap-1.5 text-muted-foreground">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />)}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="w-full h-10 rounded-lg text-white font-semibold text-sm mt-1 shadow-sm"
                                            style={{ backgroundColor: config.primary_color }}
                                        >
                                            Sign in
                                        </button>

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                                            <div className="relative flex justify-center text-xs font-semibold"><span className="bg-card px-3 text-muted-foreground">Or continue with</span></div>
                                        </div>

                                        <div className="h-10 rounded-lg border border-border bg-card text-on-surface flex items-center justify-center font-semibold text-sm shadow-sm">
                                            Sign in with SSO
                                        </div>
                                    </div>

                                    <div className="mt-6 text-center border-t border-border pt-4">
                                        <p className="text-xs font-medium text-muted-foreground">Powered by WardSeal</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default Branding;
