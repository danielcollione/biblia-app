import { Component } from '@angular/core';
import { PricingAccessDeniedComponent } from '../../../pricing-access-denied/pricing-access-denied.component';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [PricingAccessDeniedComponent],
  template: `<app-pricing-access-denied></app-pricing-access-denied>`,
  styles: [`
    @keyframes pageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    :host { display: block; animation: pageFadeIn 480ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
    .home-page-stub { flex: 1; }
  `]
})
export class QuizPage {}
