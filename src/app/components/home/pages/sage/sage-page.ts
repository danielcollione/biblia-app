import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth';
import { SageChatService, ChatSessionDto } from '../../../../services/sage-chat/sage-chat.service';
import { VersionService } from '../../../../services/version/version-service';

type ChatRole = 'USER' | 'SAGE';

type ChatBubble = {
  role: ChatRole;
  content: string;
  timestamp: Date;
  streaming?: boolean;
};

@Component({
  selector: 'app-sage-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sage-page.html',
  styleUrl: './sage-page.scss'
})
export class SagePage implements AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly sageChatService = inject(SageChatService);
  readonly versionService = inject(VersionService);

  @ViewChild('messagesViewport') private messagesViewportRef?: ElementRef<HTMLDivElement>;

  readonly sessions = signal<ChatSessionDto[]>([]);
  readonly activeSessionId = signal<string | null>(null);
  readonly messages = signal<ChatBubble[]>([]);
  readonly inputMessage = signal('');
  readonly isLoadingSessions = signal(true);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly hasActiveSubscription = computed(() => this.isSubscriptionActive());
  readonly canSend = computed(() => this.hasActiveSubscription() && this.inputMessage().trim().length > 0 && !this.isSending());

  readonly insightPrompts = computed(() => [
    this.versionService.ui().sageChatInsightOne,
    this.versionService.ui().sageChatInsightTwo,
    this.versionService.ui().sageChatInsightThree,
    this.versionService.ui().sageChatInsightFour,
  ]);

  private streamAbortController: AbortController | null = null;

  constructor() {
    this.bootstrap();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.streamAbortController?.abort();
  }

  async createNewSession(): Promise<void> {
    if (!this.hasActiveSubscription()) {
      this.errorMessage.set(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    try {
      this.errorMessage.set(null);
      const created = await this.sageChatService.createSessionAsync();

      this.sessions.update((current) => [created, ...current]);
      this.activeSessionId.set(created.id);
      this.messages.set([]);
      this.inputMessage.set('');
    } catch (error) {
      this.errorMessage.set(this.resolveError(error, this.versionService.ui().sageChatSessionCreateError));
    }
  }

  async sendCurrentMessage(): Promise<void> {
    if (!this.hasActiveSubscription()) {
      this.errorMessage.set(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    const trimmed = this.inputMessage().trim();
    if (!trimmed || this.isSending()) {
      return;
    }

    if (!this.activeSessionId()) {
      await this.createNewSession();
      if (!this.activeSessionId()) {
        return;
      }
    }

    this.errorMessage.set(null);
    this.isSending.set(true);

    const userBubble: ChatBubble = { role: 'USER', content: trimmed, timestamp: new Date() };
    const sageBubble: ChatBubble = { role: 'SAGE', content: '', timestamp: new Date(), streaming: true };

    this.messages.update((current) => [...current, userBubble, sageBubble]);
    this.inputMessage.set('');
    this.scrollToBottom();

    this.streamAbortController?.abort();
    this.streamAbortController = new AbortController();

    try {
      await this.sageChatService.streamReply(
        this.activeSessionId()!,
        trimmed,
        (chunk) => {
          this.messages.update((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === 'SAGE') {
              last.content += chunk;
            }
            return next;
          });
          this.scrollToBottom();
        },
        this.streamAbortController.signal
      );

      this.messages.update((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === 'SAGE') {
          last.streaming = false;
          if (!last.content.trim()) {
            last.content = this.versionService.ui().sageChatEmptyAnswerFallback;
          }
        }
        return next;
      });

      await this.reloadSessions();
    } catch (error) {
      this.messages.update((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === 'SAGE') {
          last.streaming = false;
          last.content = this.versionService.ui().sageChatStreamError;
        }
        return next;
      });
      this.errorMessage.set(this.resolveError(error, this.versionService.ui().sageChatStreamError));
    } finally {
      this.isSending.set(false);
      this.streamAbortController = null;
    }
  }

  useInsightPrompt(prompt: string): void {
    if (!this.hasActiveSubscription()) {
      this.errorMessage.set(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    this.inputMessage.set(prompt);
  }

  onComposerEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendCurrentMessage();
    }
  }

  trackSession(_: number, session: ChatSessionDto): string {
    return session.id;
  }

  private async bootstrap(): Promise<void> {
    this.isLoadingSessions.set(true);
    this.errorMessage.set(null);

    if (!this.hasActiveSubscription()) {
      this.isLoadingSessions.set(false);
      this.errorMessage.set(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    try {
      await this.reloadSessions();

      if (!this.sessions().length) {
        await this.createNewSession();
      } else {
        this.activeSessionId.set(this.sessions()[0].id);
      }
    } catch (error) {
      this.errorMessage.set(this.resolveError(error, this.versionService.ui().sageChatSessionLoadError));
    } finally {
      this.isLoadingSessions.set(false);
    }
  }

  private async reloadSessions(): Promise<void> {
    const listed = await firstValueFrom(this.sageChatService.listSessions());
    this.sessions.set(listed ?? []);

    const activeId = this.activeSessionId();
    if (activeId && !this.sessions().some((session) => session.id === activeId)) {
      this.activeSessionId.set(this.sessions()[0]?.id ?? null);
    }
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const viewport = this.messagesViewportRef?.nativeElement;
      if (!viewport) {
        return;
      }

      viewport.scrollTop = viewport.scrollHeight;
    });
  }

  private resolveError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as { status?: number; error?: { message?: string } | string };
      if (httpError.status === 403) {
        return this.versionService.ui().sageChatPremiumRequired;
      }

      if (typeof httpError.error === 'string' && httpError.error.trim()) {
        return httpError.error;
      }

      if (typeof httpError.error === 'object' && httpError.error?.message) {
        return httpError.error.message;
      }
    }

    if (error instanceof Error && error.message?.trim()) {
      return error.message;
    }

    return fallback;
  }

  private isSubscriptionActive(): boolean {
    const user = this.authService.usuario();
    if (!user?.subscriptionActive || !user.subscriptionExpiresAt) {
      return false;
    }

    const expiresAt = new Date(user.subscriptionExpiresAt).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }
}
