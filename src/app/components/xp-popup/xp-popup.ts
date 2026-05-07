import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { XpPopupService } from '../../services/xp-popup.service';

@Component({
  selector: 'app-xp-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './xp-popup.html',
  styleUrl: './xp-popup.scss',
})
export class XpPopup {
  readonly xpPopupService = inject(XpPopupService);
}
