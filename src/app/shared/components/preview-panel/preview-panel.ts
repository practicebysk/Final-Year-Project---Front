import { Component, ElementRef, effect, input, signal, viewChild } from '@angular/core';
import { buildPreviewDocument } from '../../utils/build-preview-document';

interface Device {
  label: string;
  width: string;
  px: number | null;
}

@Component({
  selector: 'app-preview-panel',
  host: { class: 'block', '(document:keydown.escape)': 'exitFullscreen()' },
  templateUrl: './preview-panel.html',
})
export class PreviewPanel {
  readonly html = input.required<string>();
  readonly css = input.required<string>();
  readonly js = input.required<string>();

  protected readonly devices: Device[] = [
    { label: 'Desktop', width: '100%', px: null },
    { label: 'Tablet', width: '768px', px: 768 },
    { label: 'Mobile', width: '390px', px: 390 },
  ];
  protected readonly device = signal<Device>(this.devices[0]);
  protected readonly fullscreen = signal(false);

  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');
  private readonly refreshCount = signal(0);
  private appliedRefresh = 0;
  private rendered = false;

  constructor() {
    // Re-renders whenever the code changes (typing in Monaco) or Refresh is pressed.
    effect((onCleanup) => {
      const doc = buildPreviewDocument(this.html(), this.css(), this.js());
      const refresh = this.refreshCount();

      // Typing is debounced (no reload on every keystroke). The first render and Refresh are immediate.
      const immediate = !this.rendered || refresh !== this.appliedRefresh;
      const timer = setTimeout(() => this.render(doc, refresh), immediate ? 0 : 300);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected refresh(): void {
    this.refreshCount.update((n) => n + 1);
  }

  protected toggleFullscreen(): void {
    this.fullscreen.update((v) => !v);
  }

  protected exitFullscreen(): void {
    if (this.fullscreen()) this.fullscreen.set(false);
  }

  private render(doc: string, refresh: number): void {
    this.rendered = true;
    this.appliedRefresh = refresh;
    // Assigned directly, so Angular's sanitizer is not involved and nothing is marked "trusted".
    // The trailing comment makes the string differ on Refresh, which forces a reload.
    this.frame().nativeElement.srcdoc = `${doc}\n<!-- preview-refresh:${refresh} -->`;
  }
}