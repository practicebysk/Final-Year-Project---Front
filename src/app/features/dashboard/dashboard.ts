import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectApi } from '../../core/services/project-api';
import { ProjectSummary } from '../../models/project.model';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { ProjectCard } from '../../shared/components/project-card/project-card';
import { RenameDialog } from '../../shared/components/rename-dialog/rename-dialog';
import { apiErrorMessage } from '../../shared/utils/api-error';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_COUNT = 3;

interface Notice {
  text: string;
  error: boolean;
}

// ISO dates sort correctly as plain strings.
const newestFirst = (list: ProjectSummary[]) => [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, AppHeader, ProjectCard, ConfirmDialog, RenameDialog],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly projectApi = inject(ProjectApi);
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly projects = signal<ProjectSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly notice = signal<Notice | null>(null);

  protected readonly pendingDelete = signal<ProjectSummary | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly renaming = signal<ProjectSummary | null>(null);
  protected readonly renameBusy = signal(false);
  protected readonly renameError = signal<string | null>(null);

  protected readonly duplicatingId = signal<string | null>(null);

  // ----- Overview -----
  protected readonly total = computed(() => this.projects().length);
  protected readonly recent = computed(() => this.projects().slice(0, RECENT_COUNT)); // list is newest first
  protected readonly editedThisWeek = computed(() => {
    const cutoff = Date.now() - WEEK_MS;
    return this.projects().filter((p) => new Date(p.updatedAt).getTime() >= cutoff).length;
  });

  // ----- Search: project name, business name, business type -----
  protected readonly searching = computed(() => this.query().trim().length > 0);
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.projects();
    return this.projects().filter((p) =>
      [p.name, p.businessName, p.businessType].some((field) => field.toLowerCase().includes(q)),
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.noticeTimer));
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.projectApi.list().subscribe({
      next: (list) => {
        this.projects.set(newestFirst(list));
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'Could not load your projects.'));
        this.loading.set(false);
      },
    });
  }

  // ----- Rename -----
  protected askRename(project: ProjectSummary): void {
    this.renameError.set(null);
    this.renaming.set(project);
  }

  protected cancelRename(): void {
    if (!this.renameBusy()) this.renaming.set(null);
  }

  protected confirmRename(name: string): void {
    const project = this.renaming();
    if (!project || this.renameBusy()) return;
    if (name === project.name) {
      this.renaming.set(null); // nothing to change
      return;
    }

    this.renameBusy.set(true);
    this.renameError.set(null);
    this.projectApi.rename(project.id, name).subscribe({
      next: (updated) => {
        this.projects.update((list) => newestFirst(list.map((p) => (p.id === updated.id ? updated : p))));
        this.renaming.set(null);
        this.renameBusy.set(false);
        this.show(`Renamed to “${updated.name}”.`);
      },
      error: (err) => {
        this.renameError.set(apiErrorMessage(err, 'Could not rename the project.'));
        this.renameBusy.set(false);
      },
    });
  }

  // ----- Duplicate -----
  protected duplicate(project: ProjectSummary): void {
    if (this.duplicatingId()) return;
    this.duplicatingId.set(project.id);

    this.projectApi.duplicate(project.id).subscribe({
      next: (copy) => {
        this.projects.update((list) => [copy, ...list]);
        this.duplicatingId.set(null);
        this.show(`Created “${copy.name}”.`);
      },
      error: (err) => {
        this.duplicatingId.set(null);
        this.show(apiErrorMessage(err, 'Could not duplicate the project.'), true);
      },
    });
  }

  // ----- Delete -----
  protected askDelete(project: ProjectSummary): void {
    this.deleteError.set(null);
    this.pendingDelete.set(project);
  }

  protected cancelDelete(): void {
    if (!this.deleting()) this.pendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const project = this.pendingDelete();
    if (!project || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.projectApi.delete(project.id).subscribe({
      next: () => {
        this.projects.update((list) => list.filter((p) => p.id !== project.id));
        this.pendingDelete.set(null);
        this.deleting.set(false);
        this.show(`Deleted “${project.name}”.`);
      },
      error: (err) => {
        this.deleteError.set(apiErrorMessage(err, 'Could not delete the project.'));
        this.deleting.set(false);
      },
    });
  }

  private show(text: string, error = false): void {
    clearTimeout(this.noticeTimer);
    this.notice.set({ text, error });
    this.noticeTimer = setTimeout(() => this.notice.set(null), 5000);
  }
}