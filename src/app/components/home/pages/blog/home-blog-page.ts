import { Component } from '@angular/core';
import { Blog } from '../../../blog/blog';

@Component({
  selector: 'app-home-blog-page',
  standalone: true,
  imports: [Blog],
  template: `<app-blog></app-blog>`,
  styles: [
    `
      :host {
        display: block;
      }

      :host ::ng-deep .deep-studies-container {
        margin-top: 0 !important;
      }
    `,
  ],
})
export class HomeBlogPage {}
