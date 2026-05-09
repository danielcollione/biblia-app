import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth/auth';

export interface RegisterBibleChapterReadRequestDto {
  bibleCode: string;
  bookKey: string;
  chapterNumber: number;
}

export interface BibleChapterProgressResponseDto {
  bibleCode: string;
  bookKey: string;
  chapterNumber: number;
  newlyCompleted: boolean;
  xpGranted: number;
  totalChaptersReadInBible: number;
  totalChaptersReadOverall: number;
}

export interface BibleProgressSummaryResponseDto {
  totalChaptersRead: number;
  totalXpGranted: number;
  chaptersReadByBible: Record<string, number>;
}

export interface BibleReadStateResponseDto {
  bibleCodeFilter: string | null;
  totalChaptersReadOverall: number;
  chaptersReadByBibleAndBook: Record<string, Record<string, number[]>>;
}

@Injectable({ providedIn: 'root' })
export class BibleProgressService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'https://backendtub.onrender.com/api/v1/bible-progress';

  registerChapterRead(payload: RegisterBibleChapterReadRequestDto): Observable<BibleChapterProgressResponseDto> {
    return this.http.post<BibleChapterProgressResponseDto>(
      `${this.apiUrl}/chapters/read`,
      payload,
      { headers: this.buildHeaders() }
    );
  }

  getSummary(): Observable<BibleProgressSummaryResponseDto> {
    return this.http.get<BibleProgressSummaryResponseDto>(
      `${this.apiUrl}/summary`,
      { headers: this.buildHeaders() }
    );
  }

  getReadState(bibleCode?: string): Observable<BibleReadStateResponseDto> {
    const query = bibleCode ? `?bibleCode=${encodeURIComponent(bibleCode)}` : '';

    return this.http.get<BibleReadStateResponseDto>(
      `${this.apiUrl}/chapters/read/state${query}`,
      { headers: this.buildHeaders() }
    );
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }
}
