// auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Como já temos o computed 'estaAutenticado()' no serviço, fica super limpo:
  if (authService.estaAutenticado()) {
    return true; // Acesso Liberado
  }

  // Se não estiver logado, chuta o usuário para a tela de login
  router.navigate(['/login']);
  return false; 
};