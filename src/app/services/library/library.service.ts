import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    return this.http.get<LibraryBookDto[]>(this.apiUrl, {
      headers: this.buildHeaders(),
    });
  }

  getBookBySlug(bookSlug: string): Observable<LibraryBookDto> {
    return this.http.get<LibraryBookDto>(`${this.apiUrl}/${bookSlug}`, {
      headers: this.buildHeaders(),
    });
  }

  getBookChapters(bookSlug: string): Observable<LibraryChapterDto[]> {
    return this.http.get<LibraryChapterDto[]>(`${this.apiUrl}/${bookSlug}/chapters`, {
      headers: this.buildHeaders(),
    });
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
}
