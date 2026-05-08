import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth';

const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/google',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/stripe/webhook',
  '/api/v1/health',
  '/api/v1/library/books',
  '/covers/',
];

function isPublicRequest(url: string): boolean {
  return PUBLIC_PATHS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Se for uma requisição pública, passa direto
  if (isPublicRequest(req.url)) {
    return next(req);
  }

  // Tenta obter o token
  const token = authService.getToken();

  // Se não há token, passa a requisição sem modificar
  if (!token) {
    return next(req);
  }

  // Clona a requisição e adiciona o Authorization header
  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedReq);
};
