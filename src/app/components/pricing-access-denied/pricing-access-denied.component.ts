import { Component, Input, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { VersionService } from '../../services/version/version-service';
import { StripeService } from '../../services/stripe/stripe.service';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-pricing-access-denied',
  standalone: true,
  templateUrl: './pricing-access-denied.component.html',
  styleUrls: ['./pricing-access-denied.component.scss']
})
export class PricingAccessDeniedComponent {
  public readonly versionService = inject(VersionService);
  private readonly stripeService = inject(StripeService);
  private readonly authService = inject(AuthService);
  readonly isStartingCheckout = signal(false);
  readonly checkoutError = signal<string | null>(null);

  @Input() deniedResourceTitle = '';
  @Input() deniedResourceDescription = '';

  get resolvedResourceTitle(): string {
    return this.deniedResourceTitle.trim() || this.versionService.ui().pricingAccessDeniedDefaultResourceTitle;
  }

  get hasResourceDescription(): boolean {
    return this.deniedResourceDescription.trim().length > 0;
  }

  onSubscribe(): void {
    if (this.isStartingCheckout()) {
      return;
    }

    const userId = this.resolveCheckoutUserId();
    if (!userId) {
      this.checkoutError.set(this.versionService.ui().pricingAccessDeniedCheckoutMissingUser);
      return;
    }

    this.checkoutError.set(null);
    this.isStartingCheckout.set(true);

    this.stripeService.iniciarCheckout(userId).subscribe({
      next: ({ url }) => {
        this.isStartingCheckout.set(false);

        if (!url) {
          this.checkoutError.set(this.versionService.ui().pricingAccessDeniedCheckoutMissingUrl);
          return;
        }

        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.isStartingCheckout.set(false);
        this.checkoutError.set(
          error?.error?.error ||
            error?.error?.message ||
            this.versionService.ui().pricingAccessDeniedCheckoutStartError
        );
      }
    });
  }

  private resolveCheckoutUserId(): string | null {
    const usuario = this.authService.usuario();
    
    // Tenta primeiro obter do objeto do usuário (pode ter 'id' ou 'userId')
    const userIdFromObject = 
      (usuario as { id?: string; userId?: string } | null)?.id ||
      (usuario as { id?: string; userId?: string } | null)?.userId;

    if (userIdFromObject && this.isValidUUID(userIdFromObject)) {
      return userIdFromObject;
    }

    // Se não conseguir do objeto, tenta extrair do token JWT
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as {
        id?: string;
        userId?: string;
        sub?: string;
        email?: string;
      };

      // Prioriza id ou userId (que são UUIDs)
      // Ignora sub e email que podem ser strings simples
      return payload.id || payload.userId || payload.sub || null;
    } catch {
      return null;
    }
  }

  private isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
