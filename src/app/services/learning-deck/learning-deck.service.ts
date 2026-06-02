import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

// --- Interfaces tipando exatamente o que o Java devolve ---

export interface VerseHighlight {
  id: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  language: string;
  startIndex: number;
  endIndex: number;
  colorHex?: string;
}

export interface ChapterComment {
  id: string;
  bookName: string;
  chapterNumber: number;
  language: string;
  commentText: string;
}

export interface LearningDeckResponseDTO {
  highlights: VerseHighlight[];
  comments: ChapterComment[];
}

@Injectable({ providedIn: 'root' })
export class LearningDeckService {
  private readonly http = inject(HttpClient);

  // Ajuste a base URL conforme o seu environment
  private readonly API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/annotations/learning-deck';

  // Signals de Estado Global para a tela de Aprendizado
  readonly deckHighlights = signal<VerseHighlight[]>([]);
  readonly deckComments = signal<ChapterComment[]>([]);
  readonly isLoadingDeck = signal(false);

  /**
   * Busca todas as anotações e comentários do usuário em uma única pancada
   */
  loadDeck(): Observable<LearningDeckResponseDTO> {
    this.isLoadingDeck.set(true);

    return this.http.get<LearningDeckResponseDTO>(this.API_URL).pipe(
      tap((response) => {
        // Atualiza os signals para a tela renderizar os cards imediatamente
        this.deckHighlights.set(response.highlights || []);
        this.deckComments.set(response.comments || []);
        this.isLoadingDeck.set(false);
      }),
      catchError((error) => {
        this.isLoadingDeck.set(false);
        console.error('Erro ao buscar o deck de aprendizado:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Deleta um grifo e remove o card da tela reativamente
   */
  deleteHighlight(id: string): Observable<void> {
    // Usamos a mesma URL base, mas trocamos para a rota de highlights
    const url = this.API_URL.replace('/learning-deck', `/highlights/${id}`);

    return this.http.delete<void>(url).pipe(
      tap(() => {
        // .update() pega a lista atual e filtra, removendo o card apagado na hora!
        this.deckHighlights.update((highlights) => highlights.filter((h) => h.id !== id));
      }),
    );
  }

  /**
   * Deleta um comentário de capítulo e remove o card da tela reativamente
   */
  deleteComment(id: string): Observable<void> {
    // Usamos a mesma URL base, mas trocamos para a rota de comments
    const url = this.API_URL.replace('/learning-deck', `/comments/${id}`);

    return this.http.delete<void>(url).pipe(
      tap(() => {
        // Tira o comentário do Signal para sumir do HTML na mesma hora
        this.deckComments.update((comments) => comments.filter((c) => c.id !== id));
      }),
    );
  }
}
