// ============================================================
//  admin.routes.ts
// ============================================================
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./account-list/account-list.component').then(m => m.AccountListComponent),
  },
  {
    path: 'account/:id',
    loadComponent: () =>
      import('./account-detail/account-detail.component').then(m => m.AccountDetailComponent),
  },
];
