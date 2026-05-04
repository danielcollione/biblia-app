import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../auth/auth';

export interface StudyRequestDto {
  themeOrVerse: string;
  contentType: string;
  additionalNotes?: string;
  language: string;
}

export interface StudyTopic {
  heading: string;
  explanation: string;
}

export interface StudyResponseDto {
  title: string;
  baseVerse: string;
  introduction: string;
  topics: StudyTopic[];
  practicalApplication: string;
  conclusion: string;
}

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = 'https://backendtub.onrender.com/api/studies/generate';

  generateStudy(request: StudyRequestDto): Observable<StudyResponseDto> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    return this.http.post<StudyResponseDto>(this.apiUrl, request, { headers }).pipe(
      tap(() => this.authService.refreshUserProfileFromServer())
    );
  }
}
