import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Leitor } from './components/leitor/leitor';
import { Blog } from './components/blog/blog';
import { EbookPage } from './components/ebook-page/ebook-page';
import { MaterialsComponent } from './components/materials/materials';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'read', component: Leitor },
  { path: 'blog', component: Blog },
  { path: 'ebook-page', component: EbookPage },
  { path: 'materials', component: MaterialsComponent },
  { path: '**', redirectTo: '' },
];
