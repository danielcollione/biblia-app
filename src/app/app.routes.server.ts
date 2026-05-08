import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home/library/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: 'home/library/:slug/read/:chapterSlug',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
