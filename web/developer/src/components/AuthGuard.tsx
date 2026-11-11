import { AuthGuard as SharedAuthGuard } from '@wardseal/shared';
import type { AuthGuardProps } from '@wardseal/shared';

/** Developer portal: unauthenticated users go to id.* login. */
const AuthGuard = (props: Omit<AuthGuardProps, 'loginMode'>) => (
  <SharedAuthGuard {...props} loginMode="external" />
);

export default AuthGuard;
