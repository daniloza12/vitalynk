// ============================================================
//  no-auth.guard.ts — Redirige a /perfil si ya hay sesión activa
// ============================================================
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return router.createUrlTree(['/perfil']);
  return true;
};
