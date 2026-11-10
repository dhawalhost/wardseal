import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthLayout } from '@dhawalhost/wardseal-ui-kit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
      setError('This link is missing its setup token. Ask for a new invitation.');
      return;
    }
    if (password.length < 12) {
      setError('Use at least 12 characters with upper and lower case, a number and a symbol');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await completePasswordSetup(token, password);
      setSuccess('Password saved. Taking you to sign in');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || 'This link has expired or was already used. Ask for a new invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a password" description="Use at least 12 characters with upper and lower case, a number and a symbol">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" icon={<Lock />} autoComplete="new-password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" icon={<Lock />} autoComplete="new-password" className="h-11" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        {error && (
          <div role="alert" className="rounded-lg border border-error/20 bg-error-subtle px-3 py-2.5 text-sm text-error-subtle-foreground">{error}</div>
        )}
        {success && (
          <div role="status" className="rounded-lg border border-success/20 bg-success-subtle px-3 py-2.5 text-sm text-success-subtle-foreground">{success}</div>
        )}
        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          Set password
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SetPassword;
