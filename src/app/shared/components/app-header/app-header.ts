import { Component, computed, inject } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import { Logo } from '../logo/logo';

@Component({
  selector: 'app-header',
  imports: [Logo],
  host: { class: 'block shrink-0' },
  templateUrl: './app-header.html',
})
export class AppHeader {
  private readonly auth = inject(Auth);

  protected readonly userName = computed(() => this.auth.user()?.name ?? '');
  protected readonly initial = computed(() => this.userName().charAt(0).toUpperCase() || 'U');

  protected logout(): void {
    this.auth.logout();
  }
}