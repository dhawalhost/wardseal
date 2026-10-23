import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { completePasswordSetup } from '../api';

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
      <Card className="w-full max-w-md border-border shadow-sm rounded-xl bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xl font-bold tracking-tight">Set password</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Choose a secure password for your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">New password</Label>
              <Input
                id="password"
                type="password"
                className="h-11 rounded-lg border-border shadow-xs"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="h-11 rounded-lg border-border shadow-xs"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border bg-muted/40">
            <Button type="submit" className="rounded-lg font-semibold shadow-sm bg-secondary text-secondary-foreground" disabled={loading}>
              {loading ? 'Saving…' : 'Set password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SetPassword;
