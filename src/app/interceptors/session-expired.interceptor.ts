import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth/auth';

const AUTH_PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/google',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
];

function isPublicAuthRequest(url: string): boolean {
  return AUTH_PUBLIC_PATHS.some((path) => url.includes(path));
}

export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        const hasActiveToken = !!authService.getToken();

        if (hasActiveToken && !isPublicAuthRequest(req.url)) {
          authService.logout('session_expired');
        }
      }

      return throwError(() => error);
    })
  );
};