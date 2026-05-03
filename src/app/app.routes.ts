import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Leitor } from './components/leitor/leitor';
import { Blog } from './components/blog/blog';
import { EbookPage } from './components/ebook-page/ebook-page';
import { MaterialsComponent } from './components/materials/materials';
import { Login } from './components/login/login';
import { Profile } from './components/profile/profile';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'read', component: Leitor },
  { path: 'blog', component: Blog },
  { path: 'ebook-page', component: EbookPage },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
  },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'materials', component: MaterialsComponent },
  { path: '**', redirectTo: '' },
];
