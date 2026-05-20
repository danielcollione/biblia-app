import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class AiInsightService {
  private readonly http = inject(HttpClient);
  
  // URL apontando pro controller novo, 100% focado em velocidade
  private readonly API_URL = 'https://backendtub.onrender.com/api/ai/insights/quick';

  /**
   * Dispara a requisição para a IA gerar o insight rápido baseado no contexto do card
   */
  generateQuickInsight(request: InsightRequestDTO): Observable<InsightResponseDTO> {
    return this.http.post<InsightResponseDTO>(this.API_URL, request);
  }
}