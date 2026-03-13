// ============================================================
//  app.routes.ts — Routing principal con lazy loading
// ============================================================
import { Routes } from '@angular/router';
import { authGuard }   from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { roleGuard }   from './core/guards/role.guard';
import { AuthLayoutComponent }  from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent }  from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // Redirección raíz
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // ── Rutas públicas (Auth layout) ────────────────────────────
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ── Perfil (protegido, layout principal) ────────────────────
  {
    path: 'perfil',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/perfil/perfil.routes').then(m => m.PERFIL_ROUTES),
  },

  // ── Admin (protegido, solo ADMIN) ───────────────────────────
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadChildren: () =>
      import('./modules/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ── Imprimir QR (protegido, layout principal) ───────────────
  {
    path: 'imprimir',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/imprimir/imprimir.routes').then(m => m.IMPRIMIR_ROUTES),
  },

  // ── Ficha pública (sin autenticación — para escaneo de QR) ─
  {
    path: 'public',
    loadChildren: () =>
      import('./modules/public/public.routes').then(m => m.PUBLIC_ROUTES),
  },

  // ── Recuperación de contraseña ──────────────────────────────
  {
    path: 'forgot-password',
    component: AuthLayoutComponent,
    canActivate: [noAuthGuard],
    children: [{
      path: '',
      loadComponent: () =>
        import('./modules/auth/forgot-password/forgot-password.component')
          .then(m => m.ForgotPasswordComponent),
    }],
  },
  {
    path: 'reset-password',
    component: AuthLayoutComponent,
    // Sin noAuthGuard — un usuario logueado también puede necesitar resetear su contraseña
    children: [{
      path: '',
      loadComponent: () =>
        import('./modules/auth/reset-password/reset-password.component')
          .then(m => m.ResetPasswordComponent),
    }],
  },

  // ── Activación de cuenta ────────────────────────────────────
  {
    path: 'activate',
    component: AuthLayoutComponent,
    canActivate: [noAuthGuard],
    children: [{
      path: '',
      loadComponent: () =>
        import('./modules/auth/activate-account/activate-account.component')
          .then(m => m.ActivateAccountComponent),
    }],
  },

  // Fallback
  { path: '**', redirectTo: '/auth/login' },
];
