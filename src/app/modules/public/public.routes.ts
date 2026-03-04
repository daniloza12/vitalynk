// ============================================================
//  public.routes.ts — Rutas públicas (sin autenticación)
//  Accesibles por cualquier persona, diseñadas para emergencias
// ============================================================
import { Routes } from '@angular/router';

export const PUBLIC_ROUTES: Routes = [
  {
    path: ':securityAccount',
    loadComponent: () =>
      import('./account-public/account-public.component').then(
        m => m.AccountPublicComponent
      ),
  },
];
