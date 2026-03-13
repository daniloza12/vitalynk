// ============================================================
//  auth.guard.ts — Protege rutas que requieren autenticación
// ============================================================
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountStatus } from '../models/account.model';
import { AuthService } from '../services/auth.service';

const BLOCKED_STATUSES: AccountStatus[] = ['INACTIVO', 'SUSPENDIDO', 'BLOQUEADO'];

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.currentUser();

  if (!user) return router.createUrlTree(['/auth/login']);

  if (user.status && BLOCKED_STATUSES.includes(user.status)) {
    auth.logout();
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
