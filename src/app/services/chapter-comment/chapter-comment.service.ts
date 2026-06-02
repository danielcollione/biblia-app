import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { VersionService } from '../version/version-service';

// DTO para enviar os dados para o Spring Boot
export interface ChapterCommentRequestDTO {
  bookName: string;
  chapterNumber: number;
  content: string;
  language: string;
}

// A entidade completa que retorna do banco
export interface ChapterComment extends ChapterCommentRequestDTO {
  id: string;
  userId: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChapterCommentService {
  private readonly http = inject(HttpClient);
  private readonly versionService = inject(VersionService);
  
  // URL da API (Ajuste para bater com o seu Controller no Spring Boot)
  private readonly API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/annotations/comments'; 

  // Signal que vai guardar o comentário do capítulo que está aberto na tela
  currentChapterComment = signal<ChapterComment | null>(null);

  /**
   * Busca o comentário do usuário para o capítulo atual
   */
  loadComment(bookName: string, chapterNumber: number): Observable<ChapterComment | null> {
    const language = this.versionService.languageCode() || 'pt';
    const params = new HttpParams()
      .set('bookName', bookName)
      .set('chapterNumber', chapterNumber)
      .set('language', language);;

    return this.http.get<ChapterComment>(`${this.API_URL}`, { params }).pipe(
      tap(comment => this.currentChapterComment.set(comment))
    );
  }

  /**
   * Salva ou atualiza o comentário
   */
  saveComment(dto: ChapterCommentRequestDTO): Observable<ChapterComment> {
    return this.http.post<ChapterComment>(`${this.API_URL}`, dto).pipe(
      tap(savedComment => {
        // Atualiza a tela em tempo real com o retorno do back-end
        this.currentChapterComment.set(savedComment);
      })
    );
  }

  /**
   * Opcional: Remove o comentário se o usuário apagar todo o texto
   */
  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${commentId}`).pipe(
      tap(() => this.currentChapterComment.set(null))
    );
  }
}