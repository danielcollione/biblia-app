import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../services/auth/auth';
import { SageChatService, ChatSessionDto } from '../../../../services/sage-chat/sage-chat.service';
import { VersionService } from '../../../../services/version/version-service';
import { PricingAccessDeniedComponent } from '../../../pricing-access-denied/pricing-access-denied.component';

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
  imports: [CommonModule, FormsModule, PricingAccessDeniedComponent],
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
  readonly isLoadingMessages = signal(false);
  readonly isSending = signal(false);
  readonly deletingSessionId = signal<string | null>(null);
  readonly pendingDeleteSession = signal<ChatSessionDto | null>(null);
  readonly isSessionsPanelOpen = signal(false);
  readonly isAvatarModalOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackIsError = signal(true);

  readonly hasMessages = computed(() => this.messages().length > 0);
  readonly hasActiveSubscription = computed(() => this.isSubscriptionActive());
  readonly canSend = computed(() => this.hasActiveSubscription() && this.inputMessage().trim().length > 0 && !this.isSending());

  readonly insightPrompts = computed(() => [
    this.versionService.ui().sageChatInsightOne,
    this.versionService.ui().sageChatInsightTwo,
  ]);

  private streamAbortController: AbortController | null = null;
  private audioContext: AudioContext | null = null;
  private scrollAnimationFrameId: number | null = null;

  constructor() {
    effect(() => {
      const sessionId = this.activeSessionId();
      if (sessionId) {
        void this.loadSessionMessages(sessionId);
      } else {
        this.messages.set([]);
      }
    });

    this.bootstrap();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.streamAbortController?.abort();
    this.audioContext?.close().catch(() => undefined);
    if (this.scrollAnimationFrameId !== null) {
      cancelAnimationFrame(this.scrollAnimationFrameId);
      this.scrollAnimationFrameId = null;
    }
  }

  openAvatarModal(): void {
    this.isAvatarModalOpen.set(true);
  }

  closeAvatarModal(): void {
    this.isAvatarModalOpen.set(false);
  }

  async createNewSession(): Promise<void> {
    if (!this.hasActiveSubscription()) {
      this.showFeedback(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    try {
      this.clearFeedback();
      const created = await this.sageChatService.createSessionAsync();

      this.sessions.update((current) => [created, ...current]);
      this.activeSessionId.set(created.id);
      this.messages.set([]);
      this.inputMessage.set('');
      this.isSessionsPanelOpen.set(false);
    } catch (error) {
      this.showFeedback(this.resolveError(error, this.versionService.ui().sageChatSessionCreateError));
    }
  }

  toggleSessionsPanel(): void {
    this.isSessionsPanelOpen.update((current) => !current);
  }

  closeSessionsPanel(): void {
    this.isSessionsPanelOpen.set(false);
  }

  selectSession(sessionId: string): void {
    this.activeSessionId.set(sessionId);
    this.isSessionsPanelOpen.set(false);
  }

  deleteSession(session: ChatSessionDto, event?: Event): void {
    event?.stopPropagation();

    if (!this.hasActiveSubscription()) {
      this.showFeedback(this.versionService.ui().sageChatPremiumRequired);
      return;
    }

    if (this.deletingSessionId() || this.isSending()) {
      return;
    }

    this.pendingDeleteSession.set(session);
  }

  closeDeleteSessionModal(): void {
    if (this.deletingSessionId()) {
      return;
    }

    this.pendingDeleteSession.set(null);
  }

  confirmDeleteSession(): void {
    const session = this.pendingDeleteSession();
    if (!session) {
      return;
    }

    const sessionId = session.id;

    const currentSessions = this.sessions();
    const deletedIndex = currentSessions.findIndex((session) => session.id === sessionId);
    if (deletedIndex === -1) {
      this.pendingDeleteSession.set(null);
      return;
    }

    const fallbackSessionId = currentSessions[deletedIndex + 1]?.id
      ?? currentSessions[deletedIndex - 1]?.id
      ?? null;
    const isDeletingActiveSession = this.activeSessionId() === sessionId;

    if (isDeletingActiveSession) {
      this.streamAbortController?.abort();
      this.streamAbortController = null;
      this.isSending.set(false);
    }

    this.deletingSessionId.set(sessionId);
    this.clearFeedback();

    this.sageChatService.deleteSession(sessionId)
      .pipe(finalize(() => this.deletingSessionId.set(null)))
      .subscribe({
        next: () => {
          this.sessions.update((items) => items.filter((session) => session.id !== sessionId));

          if (isDeletingActiveSession) {
            this.activeSessionId.set(fallbackSessionId);
            if (!fallbackSessionId) {
              this.messages.set([]);
              this.inputMessage.set('');
            }
          }

          this.pendingDeleteSession.set(null);
          this.showFeedback(this.versionService.ui().sageChatSessionDeleteSuccess, false);
        },
        error: (error) => {
          this.showFeedback(this.resolveError(error, this.versionService.ui().sageChatSessionDeleteError));
        }
      });
  }

  isDeletingSession(sessionId: string): boolean {
    return this.deletingSessionId() === sessionId;
  }

  clearFeedback(): void {
    this.errorMessage.set(null);
  }

  async sendCurrentMessage(): Promise<void> {
    if (!this.hasActiveSubscription()) {
      this.showFeedback(this.versionService.ui().sageChatPremiumRequired);
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

    this.clearFeedback();
    this.isSending.set(true);

    const userBubble: ChatBubble = { role: 'USER', content: trimmed, timestamp: new Date() };
    const sageBubble: ChatBubble = { role: 'SAGE', content: '', timestamp: new Date(), streaming: true };

    this.messages.update((current) => [...current, userBubble, sageBubble]);
    this.inputMessage.set('');
    this.scrollToBottom();

    this.streamAbortController?.abort();
    this.streamAbortController = new AbortController();
    let responseSoundPlayed = false;

    try {
      await this.sageChatService.streamReply(
        this.activeSessionId()!,
        trimmed,
        (chunk) => {
          if (!responseSoundPlayed && chunk.trim()) {
            responseSoundPlayed = true;
            this.playSageReplySound();
          }

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
          } else if (!responseSoundPlayed) {
            responseSoundPlayed = true;
            this.playSageReplySound();
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
      this.showFeedback(this.resolveError(error, this.versionService.ui().sageChatStreamError));
    } finally {
      this.isSending.set(false);
      this.streamAbortController = null;
    }
  }

  useInsightPrompt(prompt: string): void {
    if (!this.hasActiveSubscription()) {
      this.showFeedback(this.versionService.ui().sageChatPremiumRequired);
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
    this.clearFeedback();

    if (!this.hasActiveSubscription()) {
      this.isLoadingSessions.set(false);
      this.showFeedback(this.versionService.ui().sageChatPremiumRequired);
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
      this.showFeedback(this.resolveError(error, this.versionService.ui().sageChatSessionLoadError));
    } finally {
      this.isLoadingSessions.set(false);
    }
  }

  private showFeedback(message: string, isError = true): void {
    this.feedbackIsError.set(isError);
    this.errorMessage.set(message);
  }

  private async loadSessionMessages(sessionId: string): Promise<void> {
    this.messages.set([]);
    this.isLoadingMessages.set(true);

    try {
      const msgs = await firstValueFrom(this.sageChatService.getSessionMessages(sessionId));
      if (this.activeSessionId() !== sessionId) {
        return; // stale — user switched session while loading
      }

      this.messages.set(
        (msgs ?? []).map((m) => ({
          role: m.role as ChatRole,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })),
      );
      this.scrollToBottom();
    } catch {
      if (this.activeSessionId() === sessionId) {
        this.messages.set([]);
      }
    } finally {
      if (this.activeSessionId() === sessionId) {
        this.isLoadingMessages.set(false);
      }
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
    if (typeof window === 'undefined') {
      return;
    }

    if (this.scrollAnimationFrameId !== null) {
      cancelAnimationFrame(this.scrollAnimationFrameId);
    }

    this.scrollAnimationFrameId = requestAnimationFrame(() => {
      const viewport = this.messagesViewportRef?.nativeElement;
      if (!viewport) {
        this.scrollAnimationFrameId = null;
        return;
      }

      viewport.scrollTop = viewport.scrollHeight;

      // A second frame helps keep the viewport pinned while streamed text expands.
      this.scrollAnimationFrameId = requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
        this.scrollAnimationFrameId = null;
      });
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

  private playSageReplySound(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    this.audioContext ??= new AudioContextCtor();

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => undefined);
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }
}
