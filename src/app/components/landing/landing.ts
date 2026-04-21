import { Component } from '@angular/core';
import { VersionService } from '../../services/version/version-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  constructor(
    public versionService: VersionService,
    private router: Router,
  ) {}

  irParaBiblia() {
    this.router.navigate(['/read']);
  }

  irParaBlog() {
    this.router.navigate(['/blog']);
  }
}
