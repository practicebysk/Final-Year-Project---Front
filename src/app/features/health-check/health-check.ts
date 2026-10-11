import { Component, inject, signal } from '@angular/core';
import { HealthApi } from '../core/services/health-api';
import { HealthResponse } from '../models/health-response.model';

@Component({
  selector: 'app-health-check',
  templateUrl: './health-check.html',
})
export class HealthCheck {
  private readonly healthApi = inject(HealthApi);

  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.healthApi.getHealth().subscribe({
      next: (res) => this.health.set(res),
      error: () => this.error.set('Cannot reach the backend. Is the server running?'),
    });
  }
}