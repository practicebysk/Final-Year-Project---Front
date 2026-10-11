import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import type * as Monaco from 'monaco-editor';
import { MonacoApi, MonacoLoader } from '../../../core/services/monaco-loader';

const THEME = 'awb-dark';

@Component({
  selector: 'app-code-editor',
  host: { class: 'relative block' },
  templateUrl: './code-editor.html',
})
export class CodeEditor {
  private readonly loader = inject(MonacoLoader);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input.required<string>();
  readonly language = input<string>('html');
  readonly valueChange = output<string>();

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private readonly ready = signal(false);
  readonly readOnly = input(false);

  private monaco!: MonacoApi;
  private editor: Monaco.editor.IStandaloneCodeEditor | null = null;
  private readonly models = new Map<string, Monaco.editor.ITextModel>(); // one per language/file
  private applying = false; // true while we change the text ourselves, so it isn't reported as typing
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.init());

    // Keeps Monaco in sync when the parent changes the file or its content.
    effect(() => {
      const language = this.language();
      const value = this.value();
      if (!this.ready()) return;
      this.show(language, value);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.editor?.dispose();
      this.models.forEach((m) => m.dispose());
      this.models.clear();
    });

    effect(() => {
      const readOnly = this.readOnly();
      if (!this.ready()) return;
      this.editor?.updateOptions({ readOnly });
    });
  }

  protected retry(): void {
    this.status.set('loading');
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.monaco = await this.loader.load();
      if (this.destroyed) return;

      this.monaco.editor.defineTheme(THEME, {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0F172A',
          'editor.foreground': '#F8FAFC',
          'editor.lineHighlightBackground': '#1E293B',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#94A3B8',
          'editorCursor.foreground': '#6366F1',
          'editor.selectionBackground': '#6366F144',
          'editorIndentGuide.background1': '#1E293B',
          'editorWidget.background': '#111827',
          'editorWidget.border': '#334155',
        },
      });

      this.editor = this.monaco.editor.create(this.container().nativeElement, {
        theme: THEME,
        automaticLayout: true, // resizes with the panel and the responsive layout
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        fixedOverflowWidgets: true,
      });

      this.editor.onDidChangeModelContent(() => {
        if (!this.applying && this.editor) this.valueChange.emit(this.editor.getValue());
      });

      this.status.set('ready');
      this.ready.set(true); // triggers the effect, which shows the current file
    } catch (err) {
      console.error('Monaco failed to load:', err);
      if (!this.destroyed) this.status.set('error');
    }
  }

  private show(language: string, value: string): void {
    if (!this.editor) return;

    let model = this.models.get(language);
    if (!model) {
      model = this.monaco.editor.createModel(value, language);
      this.models.set(language, model);
    }
    if (this.editor.getModel() !== model) this.editor.setModel(model);

    // Only differs when the change came from outside (not from the user typing).
    if (model.getValue() !== value) {
      this.applying = true;
      model.setValue(value);
      this.applying = false;
    }
  }
}