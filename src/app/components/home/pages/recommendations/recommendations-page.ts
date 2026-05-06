import { Component } from '@angular/core';
import { MaterialsComponent } from '../../../../components/materials/materials';

@Component({
  selector: 'app-recommendations-page',
  standalone: true,
  imports: [MaterialsComponent],
  template: `<app-materials></app-materials>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
        margin-top: 50px !important;
      }

      :host ::ng-deep .material-container {
        margin-top: 0;
      }
    `,
  ],
})
export class RecommendationsPage {}
