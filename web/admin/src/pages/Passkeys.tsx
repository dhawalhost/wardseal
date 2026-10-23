import React, { useState } from 'react';
import { beginRegistration, finishRegistration } from '../api';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, Check, AlertTriangle } from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription, PageLayout
} from '@/components/layout';

const Passkeys: React.FC = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    // Helper to decode JWT
    const getUserID = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload).sub;
        } catch (e) {
            return null;
        }
    };

    const handleRegister = async () => {
        setMessage('');
        setError('');
        setIsRegistering(true);
        const userID = getUserID();
        if (!userID) {
            setError('User ID not found. Please log in again.');
            setIsRegistering(false);
            return;
        }

        try {
            // 1. Begin
            const options = await beginRegistration(userID);

            // 2. Browser Prompt
            const attResp = await startRegistration(options);

            // 3. Finish
            await finishRegistration(userID, attResp);

            setMessage('Passkey registered successfully! You can now use it to log in securely without a password.');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Registration failed. Your device might not support passkeys or cancelled the request.');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <PageLayout>
        <div className="space-y-page max-w-2xl mx-auto animate-in fade-in duration-300">
            <PageHeader
                icon={<Fingerprint className="w-6 h-6 text-secondary" />}
                title="Passkeys"
                description="Go passwordless with biometric authentication. Use TouchID, FaceID, or a hardware security key."
            />

            <GlassCard className="border border-border shadow-sm overflow-hidden rounded-lg bg-card">
                <GlassCardHeader className="bg-secondary py-card px-card text-secondary-foreground relative overflow-hidden">
                    <div className="absolute top-0 right-0 text-secondary-foreground/10 p-6">
                        <Fingerprint className="w-32 h-32 -mr-8 -mt-8" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 bg-secondary-foreground/10 rounded-lg flex items-center justify-center">
                            <Fingerprint className="w-8 h-8 text-secondary-foreground" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-xl font-bold tracking-tight text-secondary-foreground">Register a Passkey</GlassCardTitle>
                            <GlassCardDescription className="text-secondary-foreground/80 font-medium text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                                Use TouchID, FaceID, or a hardware security key (YubiKey) to sign in faster and more securely.
                            </GlassCardDescription>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-card space-y-6">
                    {message && (
                        <div className="bg-success-subtle border border-success/20 text-success p-4 rounded-lg flex items-center gap-3 font-semibold text-sm">
                            <Check className="h-5 w-5 shrink-0" />
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="bg-destructive/5 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-3 font-semibold text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleRegister}
                        size="lg"
                        className="w-full h-11 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground shadow-sm"
                        disabled={isRegistering}
                    >
                        {isRegistering ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for device...
                            </>
                        ) : (
                            <>
                                <Fingerprint className="mr-2 h-4 w-4" /> Register Passkey
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground font-medium">
                        Supported on modern browsers (Chrome, Safari, Edge, Firefox) on macOS, Windows, iOS, and Android.
                    </p>
                </GlassCardContent>
            </GlassCard>
        </div>
        </PageLayout>
    );
};

export default Passkeys;
