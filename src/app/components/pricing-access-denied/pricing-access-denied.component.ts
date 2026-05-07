import { Component, Input, inject } from '@angular/core';
import { VersionService } from '../../services/version/version-service';

@Component({
  selector: 'app-pricing-access-denied',
  standalone: true,
  templateUrl: './pricing-access-denied.component.html',
  styleUrls: ['./pricing-access-denied.component.scss']
})
export class PricingAccessDeniedComponent {
  public readonly versionService = inject(VersionService);

  @Input() deniedResourceTitle = '';
  @Input() deniedResourceDescription = '';

  get resolvedResourceTitle(): string {
    return this.deniedResourceTitle.trim() || this.versionService.ui().pricingAccessDeniedDefaultResourceTitle;
  }

  get hasResourceDescription(): boolean {
    return this.deniedResourceDescription.trim().length > 0;
  }

  onSubscribe(): void {
    console.log('Redirecionando para página de inscrição...');
  }
}
