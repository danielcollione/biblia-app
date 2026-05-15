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
  // --- ADICIONE ESTAS DUAS LINHAS ---
  'bible-api.com',
  'liturgiadiaria.site',
  'cpbjr.github.io',
  'esbiblia.net',
  'www.abibliadigital.com.br',
  'https://esbiblia.net',
];

function isPublicRequest(url: string): boolean {
  return PUBLIC_PATHS.some((path) => url.includes(path));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Se a URL contiver qualquer um dos caminhos públicos (internos ou externos), 
  // passa a requisição pura, sem o Header de Authorization.
  if (isPublicRequest(req.url)) {
    return next(req);
  }

  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedReq);
};