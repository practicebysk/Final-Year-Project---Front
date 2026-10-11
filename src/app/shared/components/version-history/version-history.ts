import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VersionApi } from '../../../core/services/version-api';
import { RestoredEvent, VersionDetail, VersionSource, VersionSummary } from '../../../models/version.model';
import { apiErrorMessage } from '../../utils/api-error';
import { PreviewPanel } from '../preview-panel/preview-panel';

const SOURCE_LABELS: Record<VersionSource, string> = {
  initial: 'Initial',
  ai: 'AI change',
  restore: 'Restore',
  snapshot: 'Manual edits',
};

@Component({
  selector: 'app-version-history',
  imports: [DatePipe, PreviewPanel],
  templateUrl: './version-history.html',
})
export class VersionHistory implements OnInit {
  private readonly api = inject(VersionApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  /** True when the editor has edits that were never saved. Restoring replaces them. */
  readonly hasUnsavedChanges = input(false);

  readonly closed = output<void>();
  readonly restored = output<RestoredEvent>();

  protected readonly versions = signal<VersionSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly selectedNumber = signal<number | null>(null);
  protected readonly selected = signal<VersionDetail | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);

  protected readonly confirming = signal(false);
  protected readonly restoring = signal(false);
  protected readonly restoreError = signal<string | null>(null);

  protected readonly latestNumber = computed(() => this.versions()[0]?.versionNumber ?? null); // list is newest first

  ngOnInit(): void {
    this.load();
  }

  protected sourceLabel(source: VersionSource): string {
    return SOURCE_LABELS[source];
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .list(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.versions.set(list);
          this.loading.set(false);
          if (list.length) this.select(list[0]);
        },
        error: (err) => {
          this.loadError.set(apiErrorMessage(err, 'Could not load the version history.'));
          this.loading.set(false);
        },
      });
  }

  protected select(version: VersionSummary): void {
    if (this.restoring()) return;

    this.selectedNumber.set(version.versionNumber);
    this.selected.set(null);
    this.detailError.set(null);
    this.restoreError.set(null);
    this.confirming.set(false);
    this.detailLoading.set(true);

    this.api
      .get(this.projectId(), version.versionNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          if (this.selectedNumber() !== detail.versionNumber) return; // the user already clicked another version
          this.selected.set(detail);
          this.detailLoading.set(false);
        },
        error: (err) => {
          if (this.selectedNumber() !== version.versionNumber) return;
          this.detailError.set(apiErrorMessage(err, 'Could not load this version.'));
          this.detailLoading.set(false);
        },
      });
  }

  protected restore(): void {
    const number = this.selectedNumber();
    if (number === null || this.restoring()) return;

    this.restoring.set(true);
    this.restoreError.set(null);

    // No takeUntilDestroyed on purpose: the dialog cannot be closed while this runs,
    // so the builder always receives the result and stays in sync with the server.
    this.api.restore(this.projectId(), number).subscribe({
      next: (result) => {
        this.restoring.set(false);
        this.restored.emit({ restoredFrom: number, ...result });
      },
      error: (err) => {
        this.restoreError.set(apiErrorMessage(err, 'Could not restore this version.'));
        this.restoring.set(false);
      },
    });
  }

  protected close(): void {
    if (!this.restoring()) this.closed.emit();
  }
}