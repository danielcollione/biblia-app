import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';
import { AuthService } from '../auth/auth';
import { XpPopupService } from '../xp-popup.service';

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

export interface StoredStudyCommentDto {
  id: string;
  comment: string;
  selectedSnippets: string[];
  createdAt: string;
}

export interface StoredStudyResponseDto {
  id: string;
  themeOrVerse: string;
  contentType: string;
  additionalNotes?: string;
  language: string;
  createdAt: string;
  study?: StudyResponseDto;
  generatedStudy?: StudyResponseDto;
  comments: StoredStudyCommentDto[];
}

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly xpPopupService = inject(XpPopupService);

  private readonly apiUrl = 'https://backend-tub-256195900392.us-east1.run.app/api/studies';

  generateStudy(request: StudyRequestDto): Observable<StudyResponseDto> {
    return this.http.post<StudyResponseDto>(`${this.apiUrl}/generate`, request, { headers: this.buildHeaders() }).pipe(
      timeout(30000),
      tap(() => {
        this.xpPopupService.showXp(1000);
        this.authService.refreshUserProfileFromServer();
      }),
    );
  }

  listGeneratedStudies(): Observable<StoredStudyResponseDto[]> {
    return this.http.get<StoredStudyResponseDto[]>(this.apiUrl, {
      headers: this.buildHeaders(),
    });
  }

  deleteGeneratedStudy(studyId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${studyId}`, {
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
