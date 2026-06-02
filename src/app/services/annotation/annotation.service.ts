import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
// Ajuste o import do VersionService de acordo com sua estrutura
import { VersionService } from '../version/version-service'; 
import { XpPopupService } from '../xp-popup.service';

export interface HighlightRequestDTO {
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  language: string;
  startIndex: number;
  endIndex: number;
  colorHex?: string;
}

export interface VerseHighlight extends HighlightRequestDTO {
  id: string;
  userId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AnnotationService {
  private readonly http = inject(HttpClient);
  private readonly versionService = inject(VersionService);
  private readonly xpPopService = inject(XpPopupService);

  // URL da sua API (ajuste conforme seu environment)
  private readonly API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/annotations'; 

  // Estado global dos grifos do capítulo atual para renderizar na tela
  currentChapterHighlights = signal<VerseHighlight[]>([]);

  /**
   * Busca os grifos de um capítulo e atualiza o Signal
   */
  loadHighlights(bookName: string, chapterNumber: number): Observable<VerseHighlight[]> {
    const language = this.versionService.languageCode() || 'pt';
    
    let params = new HttpParams()
      .set('bookName', bookName)
      .set('chapterNumber', chapterNumber)
      .set('language', language);

    return this.http.get<VerseHighlight[]>(`${this.API_URL}/highlights`, { params }).pipe(
      tap(highlights => this.currentChapterHighlights.set(highlights))
    );
  }

  /**
   * Salva um novo grifo
   */
  saveHighlight(dto: HighlightRequestDTO): Observable<VerseHighlight> {
    return this.http.post<VerseHighlight>(`${this.API_URL}/highlights`, dto).pipe(
      tap(newHighlight => {
        // Atualiza a tela imediatamente inserindo o novo grifo no signal
        this.currentChapterHighlights.update(list => [...list, newHighlight]);
        // Exibe o popup de XP
        this.xpPopService.showXp(250);
      })
    );
  }

  /**
   * Remove um grifo
   */
  deleteHighlight(highlightId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/highlights/${highlightId}`).pipe(
      tap(() => {
        // Remove da tela
        this.currentChapterHighlights.update(list => 
          list.filter(h => h.id !== highlightId)
        );
      })
    );
  }
}