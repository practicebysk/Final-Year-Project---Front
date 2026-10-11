import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes-guard';
import { ExportApi } from '../../core/services/export-api';
import { ProjectApi } from '../../core/services/project-api';
import { WebsiteApi } from '../../core/services/website-api';
import { FileName, Project, ProjectFile } from '../../models/project.model';
import { RestoredEvent } from '../../models/version.model';
import { AiAssistantBar } from '../../shared/components/ai-assistant-bar/ai-assistant-bar';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { CodeEditor } from '../../shared/components/code-editor/code-editor';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { FileTree } from '../../shared/components/file-tree/file-tree';
import { PreviewPanel } from '../../shared/components/preview-panel/preview-panel';
import { ProjectInfo } from '../../shared/components/project-info/project-info';
import { VersionHistory } from '../../shared/components/version-history/version-history';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { saveBlob } from '../../shared/utils/save-blob';
import { slugify } from '../../shared/utils/slugify';

type MobileTab = 'code' | 'preview';

@Component({
  selector: 'app-builder',
  imports: [RouterLink, AppHeader, FileTree, CodeEditor, PreviewPanel, AiAssistantBar, ConfirmDialog, ProjectInfo, VersionHistory],
  host: {
    '(window:beforeunload)': 'warnBeforeUnload($event)',
    '(window:keydown.control.s)': 'saveShortcut($event)',
    '(window:keydown.meta.s)': 'saveShortcut($event)',
  },
  templateUrl: './builder.html',
})
export class Builder implements HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly projectApi = inject(ProjectApi);
  private readonly websiteApi = inject(WebsiteApi);
  private readonly exportApi = inject(ExportApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly assistant = viewChild(AiAssistantBar);

  protected readonly mobileTabs: { id: MobileTab; label: string }[] = [
    { id: 'code', label: 'Code' },
    { id: 'preview', label: 'Preview' },
  ];

  protected readonly project = signal<Project | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  /** Current content of the three files. The editor and the preview both read from here. */
  protected readonly files = signal<ProjectFile[]>([]);
  /** Last saved (or loaded) content. Never mutated, only replaced. */
  private readonly savedFiles = signal<ProjectFile[]>([]);

  protected readonly activeName = signal<FileName>('index.html');
  protected readonly mobileTab = signal<MobileTab>('code');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly confirmingReset = signal(false);
  protected readonly historyOpen = signal(false);
  protected readonly downloading = signal(false);

  protected readonly busy = signal(false); // AI request in progress
  protected readonly assistantMessage = signal<string | null>(null);
  protected readonly assistantError = signal(false);

  protected readonly modifiedNames = computed<FileName[]>(() => {
    const saved = this.savedFiles();
    return this.files()
      .filter((f) => saved.find((s) => s.name === f.name)?.content !== f.content)
      .map((f) => f.name);
  });
  protected readonly dirty = computed(() => this.modifiedNames().length > 0);

  protected readonly activeFile = computed(
    () => this.files().find((f) => f.name === this.activeName()) ?? this.files()[0],
  );
  protected readonly html = computed(() => this.contentOf('index.html'));
  protected readonly css = computed(() => this.contentOf('style.css'));
  protected readonly js = computed(() => this.contentOf('script.js'));

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectApi.getById(id).subscribe({
      next: (project) => {
        this.project.set(project ?? null);
        this.files.set(project ? structuredClone(project.files) : []);
        this.savedFiles.set(project ? structuredClone(project.files) : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(apiErrorMessage(err, 'Could not load the project.'));
        this.loading.set(false);
      },
    });
  }

  /** Used by the route guard. */
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected panel(tab: MobileTab): string {
    return this.mobileTab() === tab ? 'flex' : 'hidden lg:flex';
  }

  protected updateActive(content: string): void {
    const name = this.activeName();
    this.files.update((list) => list.map((f) => (f.name === name ? { ...f, content } : f)));
    this.saveError.set(null);
  }

  protected save(): void {
    const project = this.project();
    if (!project || this.saving() || this.busy() || !this.dirty()) return;

    const snapshot = this.files(); // a new array after every edit, so this is a stable copy
    this.saving.set(true);
    this.saveError.set(null);

    this.projectApi.saveFiles(project.id, snapshot).subscribe({
      next: () => {
        // Edits made while saving stay "unsaved", because dirty compares against this snapshot.
        this.savedFiles.set(snapshot);
        this.saving.set(false);
      },
      error: (err) => {
        this.saveError.set(apiErrorMessage(err, 'Could not save your changes.'));
        this.saving.set(false);
      },
    });
  }

  protected confirmReset(): void {
    this.files.set(structuredClone(this.savedFiles()));
    this.saveError.set(null);
    this.confirmingReset.set(false);
    this.assistantMessage.set(null);
  }

  protected focusAssistant(): void {
    this.mobileTab.set('code');
    this.assistant()?.focus();
  }

  protected onAssistantSubmit(userRequest: string): void {
    const project = this.project();
    if (this.busy() || !project) return;

    this.busy.set(true);
    this.assistantMessage.set(null);
    this.assistantError.set(false);

    this.websiteApi
      .modify({
        projectId: project.id,
        existingHtml: this.html(),
        existingCss: this.css(),
        existingJavaScript: this.js(),
        userRequest,
      })
      .pipe(takeUntilDestroyed(this.destroyRef)) // leaving the page cancels the request; the server still finishes the save
      .subscribe({
        next: (result) => {
          this.busy.set(false);

          // Nothing can change the files while busy (the editor is read-only; Save, Reset and History are disabled),
          // so the result is applied directly. The server has already saved it as a new version.
          const next = this.files().map((f) => ({ ...f, content: result.files[f.name] }));
          this.files.set(next); // Monaco and the preview update from here
          this.savedFiles.set(next); // saved by the server, so not "unsaved"
          this.saveError.set(null);
          this.assistant()?.clear();
          this.mobileTab.set('preview');
          this.assistantMessage.set(
            `${result.summary} Saved as version ${result.version.versionNumber}. Open History to go back to an earlier version.`,
          );
        },
        error: (err) => {
          this.busy.set(false);
          this.fail(apiErrorMessage(err, 'The AI could not update the website.'));
        },
      });
  }

  protected download(): void {
    const project = this.project();
    if (!project || this.downloading() || this.busy()) return;

    this.downloading.set(true);
    this.assistantError.set(false);
    this.assistantMessage.set('Preparing your download… saving images can take a little while.');

    this.exportApi
      .download(project.id, { html: this.html(), css: this.css(), javascript: this.js(), includeAssets: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ blob, included, skipped }) => {
          const filename = `${slugify(project.name)}.zip`;
          saveBlob(blob, filename);
          this.downloading.set(false);

          const images =
            included === 0 && skipped === 0
              ? 'No remote images were found.'
              : `${included} image(s) saved inside the ZIP${skipped ? `, ${skipped} kept as online links` : ''}.`;
          this.assistantMessage.set(`Downloaded ${filename}. ${images}${this.dirty() ? ' It includes your unsaved edits.' : ''}`);
        },
        error: (err) => {
          this.downloading.set(false);
          this.fail(
            err instanceof Error && err.name === 'TimeoutError'
              ? 'The download took too long. Please try again.'
              : apiErrorMessage(err, 'Could not create the ZIP file.'),
          );
        },
      });
  }

  protected onRestored(event: RestoredEvent): void {
    this.files.set(event.files);
    this.savedFiles.set(event.files); // the server already saved it
    this.saveError.set(null);
    this.historyOpen.set(false);
    this.assistantError.set(false);
    this.assistantMessage.set(`Restored version ${event.restoredFrom} as new version ${event.version.versionNumber}.`);
  }

  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.dirty()) return;
    event.preventDefault();
    event.returnValue = ''; // required by some browsers to show the prompt
  }

  protected saveShortcut(event: Event): void {
    event.preventDefault(); // stops the browser's "save page" dialog
    this.save();
  }

  private fail(message: string): void {
    this.assistantError.set(true);
    this.assistantMessage.set(message);
  }

  private contentOf(name: FileName): string {
    return this.files().find((f) => f.name === name)?.content ?? '';
  }
}