// ============================================================
//  http.interceptor.ts — Interceptor HTTP global
//  - Captura 401 y redirige a /auth/login
//  - Propaga errores de red uniformemente
// ============================================================
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};
