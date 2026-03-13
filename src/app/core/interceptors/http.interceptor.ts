// ============================================================
//  http.interceptor.ts — Interceptor HTTP global
//  - Adjunta JWT en el header Authorization para rutas protegidas
//  - Captura 401 y redirige a /auth/login
// ============================================================
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const PUBLIC_URLS = [
  '/auth/register',
  '/auth/login',
  '/auth/activate',
  '/auth/resend-activation',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/accounts/security/',
];

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const isPublic = PUBLIC_URLS.some(path => req.url.includes(path));
  const token = localStorage.getItem('vl_jwt_token');

  const authReq = (!isPublic && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};
