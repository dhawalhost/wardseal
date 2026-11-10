import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    resolveManageConsoleUrl,
    resolveSafeRedirect,
    navigateSafeRedirect,
    seedSessionFromAuthResponse
} from '@wardseal/shared';
import { signup } from '../api';
import Config from '../config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Building, Lock, Mail } from 'lucide-react';
import { AuthLayout } from '@dhawalhost/wardseal-ui-kit';

const SignUp: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const plan = searchParams.get('plan') || 'free';

    useEffect(() => {
        document.title = 'WardSeal — Create account';
    }, []);

    const footerLinks = [
        { label: 'Privacy', href: `${policyBaseUrl}/policies#privacy` },
        { label: 'Terms', href: `${policyBaseUrl}/policies#terms` },
        { label: 'Support', href: `${policyBaseUrl}/support` },
    ];

    if (!Config.features.publicSignup) {
        return (
            <AuthLayout
                title="Registration is closed"
                description="Public sign-up is turned off on this server. Ask an administrator for an invitation."
                footerLinks={footerLinks}
            >
                <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/login')}>
                    Back to sign in
                </Button>
            </AuthLayout>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await signup(email, password, companyName, plan);
            // Org founder is minted as super-admin; JWT roles aren't in the JSON body.
            seedSessionFromAuthResponse(
                { ...data, roles: data.roles ?? ['super-admin'] },
                email
            );
            const redirectUri = searchParams.get('redirect_uri') || localStorage.getItem('login_redirect_uri');
            localStorage.removeItem('login_redirect_uri');
            const fallbackTarget = `${resolveManageConsoleUrl()}/dashboard`;
            if (redirectUri && resolveSafeRedirect(redirectUri)) {
                navigateSafeRedirect(redirectUri, fallbackTarget);
                return;
            }
            window.location.assign(fallbackTarget);
            return;
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 409) {
                setError("An organization with this name or domain already exists");
            } else {
                setError(err.response?.data?.error_description || err.response?.data?.error || 'We could not create the organization. Try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create your organization"
            description="You will be its first administrator. Invite your team and connect apps afterwards."
            footnote={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-on-surface underline-offset-4 hover:underline">
                        Sign in
                    </Link>
                </>
            }
            footerLinks={footerLinks}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="company">Organization name</Label>
                    <Input
                        id="company"
                        icon={<Building />}
                        placeholder="Northwind"
                        autoComplete="organization"
                        className="h-11"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                        id="email"
                        type="email"
                        icon={<Mail />}
                        placeholder="name@company.com"
                        autoComplete="email"
                        className="h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        icon={<Lock />}
                        autoComplete="new-password"
                        className="h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-describedby="password-hint"
                        required
                    />
                    <p id="password-hint" className="text-xs text-on-surface-subtle">
                        At least 12 characters with upper and lower case, a number and a symbol
                    </p>
                </div>
                {error && (
                    <div role="alert" className="rounded-lg border border-error/20 bg-error-subtle px-3 py-2.5 text-sm text-error-subtle-foreground">
                        {error}
                    </div>
                )}
                <Button type="submit" size="lg" className="w-full gap-2" isLoading={loading}>
                    Create organization
                    {!loading && <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                </Button>
            </form>
        </AuthLayout>
    );
};

export default SignUp;
