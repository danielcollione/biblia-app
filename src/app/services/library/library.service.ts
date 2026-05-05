import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth';

export interface LibraryBookDto {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  coverImage: string | null;
  premium: boolean;
  requiredLevel: number;
  chaptersCount: number;
}

export interface LibraryChapterDto {
  id: string;
  slug: string;
  title: string;
  chapterOrder: number;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = 'https://backendtub.onrender.com/api/v1/library/books';
  private readonly apiBaseUrl = 'https://backendtub.onrender.com';

  listBooks(): Observable<LibraryBookDto[]> {
    return this.getWithOptionalAuthRetry<LibraryBookDto[]>(this.apiUrl);
  }

  getBookBySlug(bookSlug: string): Observable<LibraryBookDto> {
    return this.getWithOptionalAuthRetry<LibraryBookDto>(`${this.apiUrl}/${bookSlug}`);
  }

  getBookChapters(bookSlug: string): Observable<LibraryChapterDto[]> {
    return this.getWithOptionalAuthRetry<LibraryChapterDto[]>(`${this.apiUrl}/${bookSlug}/chapters`);
  }

  resolveCoverUrl(coverImage: string | null): string {
    if (!coverImage || !coverImage.trim()) {
      return `${this.apiBaseUrl}/covers/enoch.webp`;
    }

    if (/^https?:\/\//i.test(coverImage)) {
      return coverImage;
    }

    const normalized = coverImage.startsWith('/') ? coverImage : `/${coverImage}`;
    return `${this.apiBaseUrl}${normalized}`;
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  private getWithOptionalAuthRetry<T>(url: string): Observable<T> {
    const headers = this.buildHeaders();

    return this.http.get<T>(url, { headers }).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) {
          return throwError(() => error);
        }

        if (!headers.has('Authorization')) {
          return throwError(() => error);
        }

        if (error.status !== 401 && error.status !== 403) {
          return throwError(() => error);
        }

        return this.http.get<T>(url);
      })
    );
  }
}
