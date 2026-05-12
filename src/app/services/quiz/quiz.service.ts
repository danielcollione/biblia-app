import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VersionService } from '../version/version-service';
import { QuizAnswerRequest, DailyQuizResponse, QuizReviewDTO } from './quiz.model'; // Importe a nova interface

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private readonly API = `https://backendtub.onrender.com/api/quiz`;

  constructor(private http: HttpClient, private versionService: VersionService) {}

  /**
   * Busca o pacote do dia (Perguntas + Status de conclusão)
   */
getDailyQuiz(): Observable<DailyQuizResponse> { // Altere de QuizQuestion[] para DailyQuizResponse
  const lang = this.versionService.languageCode();
  const params = new HttpParams().set('lang', lang);
  
  // AQUI ESTAVA O ERRO: Mude para <DailyQuizResponse>
  return this.http.get<DailyQuizResponse>(`${this.API}/daily`, { params });
}
// ... dentro do seu QuizService
  submitAnswer(answer: QuizAnswerRequest): Observable<void> {
    return this.http.post<void>(`${this.API}/answer`, answer);
  }

  getReview(): Observable<QuizReviewDTO[]> {
    const lang = this.versionService.languageCode();
    const params = new HttpParams().set('lang', lang);
    return this.http.get<QuizReviewDTO[]>(`${this.API}/review`, { params });
  }
}