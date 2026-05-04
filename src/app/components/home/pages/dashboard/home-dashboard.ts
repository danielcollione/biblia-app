import { Component, inject } from '@angular/core';
import { VersionService } from '../../../../services/version/version-service';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  template: `<div class="home-page-stub"></div>`,
  styles: [`.home-page-stub { flex: 1; }`]
})
export class HomeDashboard {
  readonly versionService = inject(VersionService);
}
