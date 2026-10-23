import { AuthGuard as SharedAuthGuard } from '@wardseal/shared';
import type { AuthGuardProps } from '@wardseal/shared';

/** Identity MFE: unauthenticated users stay on same-origin /login. */
const AuthGuard = (props: Omit<AuthGuardProps, 'loginMode'>) => (
  <SharedAuthGuard {...props} loginMode="local" />
);

export default AuthGuard;
