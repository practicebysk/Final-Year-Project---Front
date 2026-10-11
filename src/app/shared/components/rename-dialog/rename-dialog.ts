import { Component, ElementRef, afterNextRender, input, linkedSignal, output, viewChild } from '@angular/core';
import { computed } from '@angular/core';

const MAX_NAME = 60;

@Component({
  selector: 'app-rename-dialog',
  host: { '(document:keydown.escape)': 'cancel()' },
  templateUrl: './rename-dialog.html',
})
export class RenameDialog {
  readonly currentName = input.required<string>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly renamed = output<string>();
  readonly cancelled = output<void>();

  protected readonly maxName = MAX_NAME;
  protected readonly name = linkedSignal(() => this.currentName()); // starts as the current name
  protected readonly valid = computed(() => {
    const n = this.name().trim();
    return n.length > 0 && n.length <= MAX_NAME;
  });

  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  constructor() {
    afterNextRender(() => {
      const el = this.box().nativeElement;
      el.focus();
      el.select();
    });
  }

  protected cancel(): void {
    if (!this.busy()) this.cancelled.emit();
  }

  protected submit(event: Event): void {
    event.preventDefault(); // plain <form>: stop the browser's own submit
    if (this.valid() && !this.busy()) this.renamed.emit(this.name().trim());
  }
}