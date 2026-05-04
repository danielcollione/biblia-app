import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return true; // Se NÃO estiver logado, pode ver a tela de login
  }

  router.navigate(['/home']); // Se já estiver logado, vai para a home
  return false;
};