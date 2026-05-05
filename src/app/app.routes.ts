import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Leitor } from './components/leitor/leitor';
import { Blog } from './components/blog/blog';
import { EbookPage } from './components/ebook-page/ebook-page';
import { MaterialsComponent } from './components/materials/materials';
import { Login } from './components/login/login';
import { Profile } from './components/profile/profile';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { Home } from './components/home/home';

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
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./components/home/pages/dashboard/home-dashboard').then(m => m.HomeDashboard) },
      { path: 'outlines', loadComponent: () => import('./components/home/pages/outlines/outlines-page').then(m => m.OutlinesPage) },
      { path: 'prayers', loadComponent: () => import('./components/home/pages/prayers/prayers-page').then(m => m.PrayersPage) },
      { path: 'sage', loadComponent: () => import('./components/home/pages/sage/sage-page').then(m => m.SagePage) },
      { path: 'library', loadComponent: () => import('./components/home/pages/library/library-page').then(m => m.LibraryPage) },
      { path: 'library/bible-selector', loadComponent: () => import('./components/home/pages/library/library-bible-selector-page').then(m => m.LibraryBibleSelectorPage) },
      { path: 'library/:slug/read/:chapterSlug', loadComponent: () => import('./components/home/pages/library/library-book-reader-page').then(m => m.LibraryBookReaderPage) },
      { path: 'library/:slug', loadComponent: () => import('./components/home/pages/library/library-book-chapters-page').then(m => m.LibraryBookChaptersPage) },
      { path: 'quiz', loadComponent: () => import('./components/home/pages/quiz/quiz-page').then(m => m.QuizPage) },
      { path: 'recommendations', loadComponent: () => import('./components/home/pages/recommendations/recommendations-page').then(m => m.RecommendationsPage) },
      { path: 'blog', loadComponent: () => import('./components/home/pages/blog/home-blog-page').then(m => m.HomeBlogPage) },
      { path: 'ranking', loadComponent: () => import('./components/home/pages/ranking/ranking-page').then(m => m.RankingPage) },
    ],
  },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPassword, canActivate: [guestGuard] },
  { path: 'materials', component: MaterialsComponent },
  { path: '**', redirectTo: '' },
];
