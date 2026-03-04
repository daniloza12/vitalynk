// ============================================================
//  role.guard.ts — Protege rutas por rol (ADMIN | USER)
// ============================================================
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/account.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth        = inject(AuthService);
  const router      = inject(Router);
  const user        = auth.currentUser();
  const required    = route.data['role'] as Role | undefined;

  if (user && (!required || user.role === required)) return true;

  // Redirige a perfil si está logueado pero sin el rol necesario
  return router.createUrlTree(user ? ['/perfil'] : ['/auth/login']);
};
