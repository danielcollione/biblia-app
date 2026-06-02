import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-home-profile-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-editor-panel.html',
  styleUrls: ['./profile-editor-panel.scss'],
})
export class HomeProfileEditorPanelComponent implements OnChanges {
  public readonly versionService = inject(VersionService);

  @Input() currentName = '';
  @Input() hasActiveSubscription = false;
  @Input() isSavingName = false;
  @Input() profileAvatarUrl: string | null = null;
  @Input() profileAvatarInitial = 'U';
  @Input() profileRole = '';

  @Output() closeEditor = new EventEmitter<void>();
  @Output() saveName = new EventEmitter<string>();
  @Output() cancelSubscriptionNow = new EventEmitter<void>();

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
  });

  readonly isSubscriptionCancelConfirmationOpen = signal(false);
  readonly failedAvatarUrl = signal<string | null>(null);

  shouldShowAvatarImage(): boolean {
    const avatarUrl = this.profileAvatarUrl?.trim() || null;
    return !!avatarUrl && this.failedAvatarUrl() !== avatarUrl;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentName']) {
      this.nameControl.setValue(this.currentName?.trim() || '', { emitEvent: false });
    }

    if (!this.hasActiveSubscription) {
      this.isSubscriptionCancelConfirmationOpen.set(false);
    }

    if (changes['profileAvatarUrl']) {
      this.failedAvatarUrl.set(null);
    }
  }

  save(): void {
    if (this.isSavingName) {
      return;
    }

    this.nameControl.markAsTouched();
    const trimmed = this.nameControl.value.trim();

    if (!trimmed || this.nameControl.invalid) {
      return;
    }

    this.saveName.emit(trimmed);
  }

  close(): void {
    this.closeEditor.emit();
  }

  openSubscriptionCancelConfirmation(): void {
    this.isSubscriptionCancelConfirmationOpen.set(true);
  }

  abortSubscriptionCancelConfirmation(): void {
    this.isSubscriptionCancelConfirmationOpen.set(false);
  }

  confirmImmediateSubscriptionCancel(): void {
    this.cancelSubscriptionNow.emit();
    this.isSubscriptionCancelConfirmationOpen.set(false);
  }

  onAvatarError(): void {
    const avatarUrl = this.profileAvatarUrl?.trim() || null;
    if (avatarUrl) {
      this.failedAvatarUrl.set(avatarUrl);
    }
  }
}
