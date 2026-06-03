import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

// --- Interfaces do Contrato de IA ---

export interface InsightRequestDTO {
  type: 'VERSE' | 'CHAPTER_COMMENT';
  bookName: string;
  chapterNumber: number;
  verseNumber?: number | null; 
  userText?: string | null;     
  language: string;
}

export interface InsightResponseDTO {
  insightText: string;
}

export interface ChapterInsightRequestDTO {
  bookName: string;
  chapterNumber: number;
  language: string;
}

@Injectable({ providedIn: 'root' })
export class AiInsightService {
  private readonly http = inject(HttpClient);

  private static readonly CHAPTER_CACHE_TTL_MS = 60 * 60 * 1000;
  private static readonly CHAPTER_CACHE_MAX_ENTRIES = 300;
  private readonly chapterSummaryCache = new Map<string, { response: InsightResponseDTO; expiresAt: number }>();
  
  // URL apontando pro controller novo, 100% focado em velocidade
  private readonly API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/ai/insights/quick';
  private readonly CHAPTER_SUMMARY_API_URL = 'https://backend-tub-256195900392.us-east1.run.app/api/ai/insights/chapter-summary';

  /**
   * Dispara a requisição para a IA gerar o insight rápido baseado no contexto do card
   */
  generateQuickInsight(request: InsightRequestDTO): Observable<InsightResponseDTO> {
    return this.http.post<InsightResponseDTO>(this.API_URL, request);
  }

  /**
   * Dispara a requisição para a IA gerar um resumo breve do capítulo informado.
   */
  generateChapterSummaryInsight(request: ChapterInsightRequestDTO): Observable<InsightResponseDTO> {
    const cacheKey = this.buildChapterSummaryKey(request);
    const cached = this.chapterSummaryCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return of(cached.response);
    }

    if (cached && cached.expiresAt <= now) {
      this.chapterSummaryCache.delete(cacheKey);
    }

    return this.http.post<InsightResponseDTO>(this.CHAPTER_SUMMARY_API_URL, request).pipe(
      tap((response) => {
        if (!response?.insightText?.trim()) {
          return;
        }

        const savedAt = Date.now();

        if (this.chapterSummaryCache.size >= AiInsightService.CHAPTER_CACHE_MAX_ENTRIES) {
          this.clearExpiredEntries();

          if (this.chapterSummaryCache.size >= AiInsightService.CHAPTER_CACHE_MAX_ENTRIES) {
            const oldestKey = this.chapterSummaryCache.keys().next().value;
            if (oldestKey) {
              this.chapterSummaryCache.delete(oldestKey);
            }
          }
        }

        this.chapterSummaryCache.set(cacheKey, {
          response,
          expiresAt: savedAt + AiInsightService.CHAPTER_CACHE_TTL_MS,
        });
      }),
    );
  }

  private buildChapterSummaryKey(request: ChapterInsightRequestDTO): string {
    return [request.bookName.trim().toLowerCase(), request.chapterNumber, request.language.trim().toLowerCase()].join('|');
  }

  private clearExpiredEntries(): void {
    const now = Date.now();
    this.chapterSummaryCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.chapterSummaryCache.delete(key);
      }
    });
  }
}