import React, { useState } from 'react';
import { beginRegistration, finishRegistration } from '../api';
import { startRegistration } from '@simplewebauthn/browser';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, Check, AlertTriangle } from 'lucide-react';
import { jwtDecode } from "jwt-decode"; // IF we had this package, but let's stick to the manual decoding for now or just generic payload

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
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Passkeys</h1>
                <p className="text-muted-foreground">Go passwordless with biometric authentication.</p>
            </div>

            <Card className="border-2 border-muted/40 shadow-sm">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Fingerprint className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle className="text-center">Register a New Passkey</CardTitle>
                    <CardDescription className="text-center max-w-sm mx-auto">
                        Use TouchID, FaceID, or a hardware security key (YubiKey) to sign in faster and more securely.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    {message && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center gap-2 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                            <Check className="h-5 w-5" /> {message}
                        </div>
                    )}
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> {error}
                        </div>
                    )}

                    <Button
                        onClick={handleRegister}
                        size="lg"
                        className="w-full h-12 text-base"
                        disabled={isRegistering}
                    >
                        {isRegistering ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Waiting for device...
                            </>
                        ) : (
                            <>
                                <Fingerprint className="mr-2 h-5 w-5" /> Register Passkey
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Supported on modern browsers (Chrome, Safari, Edge, Firefox) on macOS, Windows, iOS, and Android.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default Passkeys;
