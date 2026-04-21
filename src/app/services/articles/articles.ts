import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { VersionService } from '../version/version-service'; // Ajuste o caminho

export interface Article {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  thumbnail: string;
  content: string;
  author: string;
  date: string;
  readingTime: string;

  affiliate?: {
    link: string;
    productName: string;
    description: string;
    price?: string;
    image: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ArticlesService {
  private http = inject(HttpClient);
  private versionService = inject(VersionService);

  /**
   * Retorna um Observable que emite a lista de artigos toda vez
   * que o idioma ativo no VersionService é alterado.
   */
  getArticles(): Observable<Article[]> {
    return this.versionService.activeVersion$.pipe(
      switchMap((version) => {
        // Extrai o 'pt', 'en' ou 'es' do id (ex: 'pt_nvi' -> 'pt')
        const lang = version.id.split('_')[0];
        
        // Monta a URL dinâmica baseada no idioma
        const jsonUrl = `/articles/articles-${lang}.json`;
        
        return this.http.get<Article[]>(jsonUrl);
      })
    );
  }
}