import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSetup, getSetupStatus } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShieldCheck, Loader2, Key } from 'lucide-react';
import {
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassCardDescription,
} from '@/components/layout';

const Setup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await getSetupStatus();
                if (!status.setup_required) {
                    navigate('/login');
                }
            } catch (err) {
                console.error('Failed to check setup status', err);
            } finally {
                setChecking(false);
            }
        };
        checkStatus();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            const resp = await performSetup(email, password);
            localStorage.setItem('token', resp.token);
            localStorage.setItem('tenantID', resp.tenant_id || 'admin-system');
            localStorage.setItem('tenantSlug', resp.tenant_slug || 'admin');

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Checking setup status…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-6 py-12">
            <div className="w-full max-w-[420px] space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                </div>

                <GlassCard className="shadow-sm border-border bg-card overflow-hidden rounded-xl">
                    <GlassCardHeader className="pt-8 pb-4 px-8 text-center border-b border-border">
                        <GlassCardTitle className="text-2xl font-bold tracking-tight">Initial setup</GlassCardTitle>
                        <GlassCardDescription className="mt-2">
                            Create the root administrator account for this WardSeal instance.
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <form onSubmit={handleSubmit}>
                        <GlassCardContent className="px-8 pb-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-on-surface">
                                    Admin email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@company.com"
                                    className="h-12 rounded-lg border-border bg-background shadow-xs"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-semibold text-on-surface">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        className="h-12 pl-10 rounded-lg border-border bg-background shadow-xs"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-on-surface">
                                    Confirm password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Re-enter password"
                                    className="h-12 rounded-lg border-border bg-background shadow-xs"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="pt-2 space-y-4">
                                <Button
                                    type="submit"
                                    className="w-full h-12 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete setup'}
                                </Button>

                                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                    This account receives full administrative authority for the instance.
                                </p>
                            </div>
                        </GlassCardContent>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default Setup;
