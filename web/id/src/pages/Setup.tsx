import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSetup, getSetupStatus } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Key, Mail } from 'lucide-react';
import { AuthLayout } from '@dhawalhost/wardseal-ui-kit';

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
            setError('The passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Use at least 8 characters');
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
            setError(err.response?.data?.error || 'Setup did not complete. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-background">
                <p className="flex items-center gap-2 text-sm text-on-surface-subtle" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden />
                    Checking setup status
                </p>
            </div>
        );
    }

    return (
        <AuthLayout
            title="Set up this WardSeal instance"
            description="Create the root administrator. This account has full control of the instance, so use a password manager."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email">Administrator email</Label>
                    <Input
                        id="email"
                        type="email"
                        icon={<Mail />}
                        placeholder="admin@company.com"
                        autoComplete="username"
                        className="h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        icon={<Key />}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className="h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                        id="confirm"
                        type="password"
                        icon={<Key />}
                        autoComplete="new-password"
                        className="h-11"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                {error && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-error/20 bg-error-subtle px-3 py-2.5 text-sm text-error-subtle-foreground">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                        <span>{error}</span>
                    </div>
                )}
                <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                    Create administrator
                </Button>
            </form>
        </AuthLayout>
    );
};

export default Setup;
