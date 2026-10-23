import React, { useState, useEffect } from 'react';
import {
    PageHeader,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
} from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Terminal,
} from 'lucide-react';
import { api } from '../api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

    if (loading) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading MFA status…</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-page animate-in fade-in duration-500 py-8">
            <PageHeader
                icon={<Smartphone className="w-8 h-8 text-primary" />}
                title="Multi-factor authentication"
                description="Protect your account with a time-based one-time password (TOTP) authenticator."
                actions={
                    verified ? (
                        <Badge className="bg-success/10 text-success border-none rounded-lg font-semibold text-xs px-3 py-1.5 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            MFA enabled
                        </Badge>
                    ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 border-none rounded-lg font-semibold text-xs px-3 py-1.5 flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Not enabled
                        </Badge>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card">
                <div className="lg:col-span-8">
                    <GlassCard className="shadow-sm border-border bg-card overflow-hidden rounded-xl">
                        <GlassCardHeader className="py-6 px-8 border-b border-border">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-xl font-bold tracking-tight">
                                        Authenticator app
                                    </GlassCardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Time-based one-time password (TOTP)
                                    </p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-8">
                            {error && (
                                <Alert
                                    variant="destructive"
                                    className="mb-8 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive"
                                >
                                    <AlertDescription className="text-sm font-medium flex items-center gap-3">
                                        <XCircle className="w-4 h-4" />
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {!enrolled && (
                                <div className="text-center py-12 space-y-6">
                                    <div className="mx-auto w-20 h-20 bg-muted rounded-xl flex items-center justify-center relative">
                                        <Unlock className="h-10 w-10 text-muted-foreground" />
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border border-border rounded-lg shadow-sm flex items-center justify-center">
                                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold tracking-tight text-on-surface">
                                            MFA not enabled
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                            Add an authenticator app to require a verification code when you sign in.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleEnroll}
                                        disabled={enrolling}
                                        className="h-11 px-8 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground"
                                    >
                                        {enrolling ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="mr-2 h-4 w-4" />
                                        )}
                                        Enable MFA
                                    </Button>
                                </div>
                            )}

                            {enrolled && !verified && qrCode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                <QrCode className="w-4 h-4" />
                                                Scan QR code
                                            </Label>
                                            <div className="bg-card p-6 rounded-xl border border-border flex justify-center shadow-sm">
                                                <img
                                                    src={`data:image/png;base64,${qrCode}`}
                                                    alt="TOTP QR Code"
                                                    className="w-full max-w-[200px] aspect-square mix-blend-multiply"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3 bg-muted/40 p-5 rounded-xl border border-border">
                                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                <Terminal className="w-4 h-4" />
                                                Manual setup key
                                            </Label>
                                            <div className="font-mono text-xs font-semibold tracking-wide text-center select-all bg-card py-3 rounded-lg border border-border shadow-sm text-primary">
                                                {secret}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                Verification code
                                            </Label>
                                            <Input
                                                value={verifyCode}
                                                onChange={(e) => setVerifyCode(e.target.value)}
                                                placeholder="000000"
                                                className="h-14 text-center text-2xl font-semibold tracking-[0.15em] border-border bg-background rounded-lg shadow-xs font-mono"
                                                maxLength={6}
                                                autoFocus
                                            />
                                            <p className="text-sm text-muted-foreground text-center leading-relaxed">
                                                Enter the 6-digit code from your authenticator app.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleVerify}
                                            className="h-11 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground"
                                        >
                                            Verify code
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {enrolled && verified && (
                                <div className="text-center space-y-8 py-12">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative">
                                            <div className="w-20 h-20 bg-success-subtle rounded-xl flex items-center justify-center border border-success/20 shadow-sm">
                                                <CheckCircle className="h-10 w-10 text-success" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border border-border rounded-lg shadow-sm flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-success" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold tracking-tight text-on-surface">
                                                MFA enabled
                                            </h3>
                                            <div className="flex items-center gap-2 justify-center py-1 px-4 bg-success-subtle rounded-full border border-success/20 w-fit mx-auto">
                                                <div className="w-1.5 h-1.5 bg-success rounded-full" />
                                                <span className="text-xs font-semibold text-success">Verified</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                                        Your account requires a verification code from your authenticator app at sign-in.
                                    </p>

                                    <div className="pt-8 border-t border-border">
                                        <Button
                                            variant="ghost"
                                            className="h-10 px-6 rounded-lg font-semibold text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={handleDisable}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Disable MFA
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </GlassCardContent>
                    </GlassCard>
                </div>

                <div className="lg:col-span-4 space-y-card">
                    <GlassCard className="shadow-sm border-border bg-secondary text-secondary-foreground overflow-hidden rounded-xl p-6">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary-foreground/10 rounded-lg">
                                    <Info className="w-5 h-5" />
                                </div>
                                <h4 className="text-base font-bold tracking-tight">Security overview</h4>
                            </div>

                            <div className="space-y-4">
                                {[
                                    {
                                        label: 'Risk profile',
                                        value: intel?.risk_level
                                            ? `${String(intel.risk_level).toUpperCase()} (${intel.risk_score || 0})`
                                            : 'Calculating…',
                                        icon: <ShieldAlert className="w-4 h-4" />,
                                    },
                                    {
                                        label: 'Last access IP',
                                        value: intel?.last_login_ip || '—',
                                        icon: <Activity className="w-4 h-4" />,
                                    },
                                    {
                                        label: 'Last sign-in',
                                        value: intel?.last_login_at
                                            ? new Date(intel.last_login_at).toLocaleDateString()
                                            : '—',
                                        icon: <Key className="w-4 h-4" />,
                                    },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="flex items-center justify-between border-b border-secondary-foreground/10 pb-3 last:border-0 last:pb-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-secondary-foreground/80">{stat.icon}</div>
                                            <span className="text-xs font-semibold text-secondary-foreground/70">
                                                {stat.label}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold font-mono">{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-secondary-foreground/5 p-4 rounded-lg border border-secondary-foreground/10">
                                <p className="text-xs leading-relaxed text-secondary-foreground/70">
                                    Your organization may require multi-factor authentication for all users.
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="p-6 rounded-xl border border-dashed border-border bg-muted/40 flex flex-col items-center gap-4">
                        <div className="p-3 bg-card rounded-lg shadow-sm border border-border">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-center space-y-1">
                            <h5 className="font-semibold text-sm text-on-surface">Trusted device</h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Sign-ins are verified against your authenticator when MFA is enabled.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MFASetup;
