import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth';

export interface ChatSessionDto {
  id: string;
  title: string;
  createdAt: string;
}

export interface CreateChatSessionDto {
  id: string;
  title: string;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SageChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = 'https://backendtub.onrender.com/api/chat';

  listSessions() {
    return this.http.get<ChatSessionDto[]>(`${this.apiUrl}/sessions`, {
      headers: this.buildHeaders(),
    });
  }

  getSessionMessages(sessionId: string) {
    return this.http.get<ChatMessageDto[]>(`${this.apiUrl}/sessions/${sessionId}/messages`, {
      headers: this.buildHeaders(),
    });
  }

  createSession() {
    return this.http.post<CreateChatSessionDto>(`${this.apiUrl}/sessions`, {}, {
      headers: this.buildHeaders(),
    });
  }

  deleteSession(sessionId: string) {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${sessionId}`, {
      headers: this.buildHeaders(),
    });
  }

  async streamReply(
    sessionId: string,
    message: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const token = this.authService.getToken();
    const response = await fetch(`${this.apiUrl}/stream/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Unable to stream response.');
    }

    if (!response.body) {
      throw new Error('Empty streaming response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const parsed = this.parseEvent(eventBlock);
        if (!parsed) {
          continue;
        }

        if (parsed.event === 'message' && parsed.data) {
          onChunk(parsed.data);
        }
      }
    }
  }

  async createSessionAsync(): Promise<CreateChatSessionDto> {
    return firstValueFrom(this.createSession());
  }

  private parseEvent(block: string): { event: string; data: string } | null {
    const lines = block.split('\n').map((line) => line.trim());
    let eventName = 'message';
    const dataParts: string[] = [];

    for (const line of lines) {
      if (!line) {
        continue;
      }

      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataParts.push(line.slice(5).trim());
      }
    }

    if (!dataParts.length && eventName !== 'done' && eventName !== 'start') {
      return null;
    }

    return {
      event: eventName,
      data: dataParts.join('\n'),
    };
  }

  private buildHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }
}
