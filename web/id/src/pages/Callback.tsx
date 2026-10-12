import React, { useEffect } from 'react';
import { navigateSafeRedirect } from '../lib/safeRedirect';

/**
 * Callback — Post-login redirect handler for web/id.
 *
 * After a successful login, authsvc sets the httpOnly cookie and the Login
 * page navigates to /callback?redirect_uri=<original-destination>.
 *
 * Only same-origin redirects are honored.
 */
const Callback: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    navigateSafeRedirect(params.get('redirect_uri'), '/profile');
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    </div>
  );
};

export default Callback;
