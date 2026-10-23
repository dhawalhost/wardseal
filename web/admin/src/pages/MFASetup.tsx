import React, { useState, useEffect } from 'react';
import {
    PageHeader,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    PageLayout
} from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    ShieldCheck,
    Smartphone,
    CheckCircle,
    XCircle,
    Trash2,
    ShieldAlert,
    Key,
    Activity,
    QrCode,
    Lock,
    Unlock,
    Info,
    Plus,
} from 'lucide-react';
import { api } from '../api';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MFASetup: React.FC = () => {
    const [enrolling, setEnrolling] = useState(false);
    const [enrolled, setEnrolled] = useState(false);
    const [verified, setVerified] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [intel, setIntel] = useState<any>(null);

    const getUserId = () => {
        return localStorage.getItem('userId') || 'admin@wardseal.com';
    };

    const fetchStatus = async () => {
        try {
            const response = await api.get(`/api/v1/mfa/totp/status?user_id=${encodeURIComponent(getUserId())}`);
            setEnrolled(response.data.enrolled);
            setVerified(response.data.verified);
            setIntel(response.data);
        } catch (err) {
            console.error('Failed to fetch TOTP status', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleEnroll = async () => {
        setEnrolling(true);
        setError('');
        try {
            const response = await api.post('/api/v1/mfa/totp/enroll', { user_id: getUserId() });
            setQrCode(response.data.qr_code);
            setSecret(response.data.secret);
            setEnrolled(true);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerify = async () => {
        setError('');
        try {
            await api.post('/api/v1/mfa/totp/verify', { user_id: getUserId(), code: verifyCode });
            setVerified(true);
            setQrCode('');
            setSecret('');
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleDisable = async () => {
        if (!window.confirm('Are you sure you want to disable TOTP MFA? This reduces your account security.')) return;
        try {
            await api.delete(`/api/v1/mfa/totp?user_id=${encodeURIComponent(getUserId())}`);
            setEnrolled(false);
            setVerified(false);
            setQrCode('');
            setSecret('');
        } catch (err) {
            console.error('Failed to disable TOTP', err);
        }
    };

    if (loading) return (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Loading MFA status…</p>
        </div>
    );

    return (
        <PageLayout>
        <div className="max-w-4xl mx-auto space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Smartphone className="w-6 h-6 text-secondary" />}
                title="Multi-Factor Authentication"
                description="Add an authenticator app as a second factor to protect your account."
                actions={
                    verified ? (
                        <Badge className="bg-success-subtle text-success border-none rounded-md font-semibold text-xs px-3 py-1.5 flex items-center gap-2 shadow-none">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            MFA enabled
                        </Badge>
                    ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 border-none rounded-md font-semibold text-xs px-3 py-1.5 flex items-center gap-2 shadow-none">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Not configured
                        </Badge>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card">
                <div className="lg:col-span-8">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                                    <Key className="w-4 h-4" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Authenticator App</GlassCardTitle>
                                    <p className="text-muted-foreground text-sm mt-0.5">Time-based one-time password (TOTP)</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card">
                            {error && (
                                <Alert variant="destructive" className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                                    <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                                        <XCircle className="w-4 h-4" />
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {!enrolled && (
                                <div className="text-center py-12 space-y-6">
                                    <div className="relative mx-auto w-fit">
                                        <div className="mx-auto w-24 h-24 bg-muted/50 rounded-lg flex items-center justify-center">
                                            <Unlock className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border border-border rounded-lg shadow-sm flex items-center justify-center">
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold tracking-tight text-on-surface">MFA not enabled</h3>
                                        <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed text-sm">
                                            Multi-factor authentication is not set up for this account. Enable it to improve security.
                                        </p>
                                    </div>
                                    <Button onClick={handleEnroll} disabled={enrolling} className="h-11 px-6 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground shadow-sm">
                                        {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Enable MFA
                                    </Button>
                                </div>
                            )}

                            {enrolled && !verified && qrCode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                                <QrCode className="w-3.5 h-3.5" />
                                                Scan QR code
                                            </Label>
                                            <div className="bg-card p-6 rounded-lg border border-border flex justify-center">
                                                <img
                                                    src={`data:image/png;base64,${qrCode}`}
                                                    alt="TOTP QR Code"
                                                    className="w-full aspect-square max-w-[200px]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 bg-muted/30 p-4 rounded-lg border border-border">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Manual entry key
                                            </Label>
                                            <div className="font-mono text-xs font-semibold text-center select-all bg-card py-3 rounded-lg border border-border text-secondary">
                                                {secret}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                                <Activity className="w-3.5 h-3.5" />
                                                Verification code
                                            </Label>
                                            <Input
                                                value={verifyCode}
                                                onChange={(e) => setVerifyCode(e.target.value)}
                                                placeholder="000000"
                                                className="h-14 text-center text-2xl font-bold tracking-[0.2em] border border-border bg-card rounded-lg focus-visible:ring-2 focus-visible:ring-secondary/20 font-mono"
                                                maxLength={6}
                                                autoFocus
                                            />
                                            <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                                Enter the 6-digit code from your authenticator app.
                                            </p>
                                        </div>
                                        <Button onClick={handleVerify} className="h-11 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground shadow-sm">
                                            Verify code
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {enrolled && verified && (
                                <div className="text-center space-y-8 py-12">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative">
                                            <div className="w-24 h-24 bg-success-subtle rounded-lg flex items-center justify-center border border-success/20">
                                                <CheckCircle className="h-12 w-12 text-success" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border border-success/20 rounded-lg shadow-sm flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-success" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold tracking-tight text-on-surface">MFA enabled</h3>
                                            <div className="flex items-center gap-2 justify-center py-1 px-4 bg-success-subtle rounded-md border border-success/20 w-fit mx-auto">
                                                <div className="w-2 h-2 bg-success rounded-full" />
                                                <span className="text-xs font-semibold text-success">Verified</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground font-medium max-w-md mx-auto text-sm leading-relaxed">
                                        Your account is protected with multi-factor authentication. You will be asked for a code when signing in.
                                    </p>

                                    <div className="pt-6 border-t border-border">
                                        <Button variant="ghost" className="h-10 px-6 rounded-lg font-semibold text-sm text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDisable}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Disable MFA
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </GlassCardContent>
                    </GlassCard>
                </div>

                <div className="lg:col-span-4 space-y-page">
                    <GlassCard className="border border-secondary/20 shadow-sm bg-secondary text-secondary-foreground overflow-hidden rounded-lg p-card h-fit">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary-foreground/10 rounded-lg">
                                    <Info className="w-4 h-4 text-secondary-foreground" />
                                </div>
                                <h4 className="text-base font-bold tracking-tight">Security overview</h4>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { 
                                        label: 'Risk Profile', 
                                        value: intel?.risk_level ? `${String(intel.risk_level).toUpperCase()} (${intel.risk_score || 0})` : 'Calculating…', 
                                        icon: <ShieldAlert className="w-4 h-4" /> 
                                    },
                                    { 
                                        label: 'Last login IP', 
                                        value: intel?.last_login_ip || '—', 
                                        icon: <Activity className="w-4 h-4" /> 
                                    },
                                    { 
                                        label: 'Last login', 
                                        value: intel?.last_login_at ? new Date(intel.last_login_at).toLocaleDateString() : '—', 
                                        icon: <Key className="w-4 h-4" /> 
                                    },
                                ].map((stat) => (
                                    <div key={stat.label} className="flex items-center justify-between border-b border-secondary-foreground/10 pb-3 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="text-secondary-foreground/80">
                                                {stat.icon}
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground/80">{stat.label}</span>
                                        </div>
                                        <span className="text-xs font-semibold font-mono text-secondary-foreground">{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-secondary-foreground/10 p-4 rounded-lg border border-secondary-foreground/10">
                                <p className="text-xs leading-relaxed font-medium text-secondary-foreground/80">
                                    Multi-factor authentication may be required by your organization&apos;s security policy.
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="p-card rounded-lg border border-dashed border-border bg-card flex flex-col items-center gap-4">
                        <div className="p-3 bg-secondary/10 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-secondary" />
                        </div>
                        <div className="text-center space-y-1">
                            <h5 className="font-semibold text-sm text-on-surface">Account protection</h5>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">Authenticator codes are verified by WardSeal when you sign in.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default MFASetup;
