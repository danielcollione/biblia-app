import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from '../auth/auth';

export interface PrayerItemDto {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  likesCount: number;
  createdAt: string;
  likedByCurrentUser: boolean;
}

export interface PrayerPageDto {
  content: PrayerItemDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class PrayersService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = 'https://backendtub.onrender.com/api/v1/prayers';

  list(page = 0, size = 36): Observable<PrayerPageDto> {
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http.get<PrayerPageDto>(this.apiUrl, {
      headers: this.buildHeaders(),
      params,
    });
  }

  create(content: string): Observable<PrayerItemDto> {
    return this.http.post<PrayerItemDto>(this.apiUrl, { content }, {
      headers: this.buildHeaders(),
    });
  }

  toggleLike(prayerId: string): Observable<PrayerItemDto> {
    return this.http.post<PrayerItemDto>(`${this.apiUrl}/${prayerId}/like`, {}, {
      headers: this.buildHeaders(),
    });
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }
}