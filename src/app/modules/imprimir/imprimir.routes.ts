import { Routes } from '@angular/router';

export const IMPRIMIR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./imprimir/imprimir.component').then(m => m.ImprimirComponent),
  },
];
