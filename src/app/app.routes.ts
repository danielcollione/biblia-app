import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Leitor } from './components/leitor/leitor';
import { Blog } from './components/blog/blog';

export const routes: Routes = [
  { path: '', component: Landing }, // Home
  { path: 'read', component: Leitor },
  { path: 'blog', component: Blog },    // Leitor da Bíblia
  { path: '**', redirectTo: '' }                  // Redireciona erros para a home
];
