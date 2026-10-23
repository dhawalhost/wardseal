import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2 } from 'lucide-react';
import { completePasswordSetup } from '../api';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription,
} from '@/components/layout';

const SetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing setup token.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters with upper, lower, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await completePasswordSetup(token, password);
      setSuccess('Password set successfully. You can now sign in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password. Link may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <GlassCard className="w-full max-w-md border border-border shadow-sm bg-card rounded-lg overflow-hidden">
        <GlassCardHeader className="p-card border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <GlassCardTitle className="text-base font-bold tracking-tight">Set Password</GlassCardTitle>
              <GlassCardDescription className="text-sm text-muted-foreground mt-0.5">Choose a secure password for your account.</GlassCardDescription>
            </div>
          </div>
        </GlassCardHeader>
        <form onSubmit={handleSubmit}>
          <GlassCardContent className="p-card space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5">
                <AlertDescription className="text-sm font-semibold">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="rounded-lg border border-success/20 bg-success-subtle text-success">
                <AlertDescription className="text-sm font-semibold">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg border border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-lg border border-border"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Set Password'}
            </Button>
          </GlassCardContent>
        </form>
      </GlassCard>
    </div>
  );
};

export default SetPassword;
