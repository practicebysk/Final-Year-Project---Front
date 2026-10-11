import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-ai-assistant-bar',
  host: { class: 'block' },
  templateUrl: './ai-assistant-bar.html',
})
export class AiAssistantBar {
  readonly busy = input(false);
  readonly message = input<string | null>(null);
  readonly isError = input(false);
  readonly submitted = output<string>();

  protected readonly prompt = signal('');
  protected readonly suggestions = [
    'Change the website theme to blue',
    'Add a pricing section with 3 pricing cards',
    'Add a WhatsApp button',
    'Add customer testimonials',
    'Make the website mobile responsive',
    'Make the design more modern',
  ];

  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  focus(): void {
    this.box()?.nativeElement.focus();
  }

  /** Called by the builder after a successful change. The text stays after a failure, so you can retry. */
  clear(): void {
    this.prompt.set('');
  }

  protected submit(): void {
    const text = this.prompt().trim();
    if (!text || this.busy()) return;
    this.submitted.emit(text);
  }
}