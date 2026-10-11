import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectApi } from '../../core/services/project-api';
import { WebsiteApi } from '../../core/services/website-api';
import { CreateProjectInput, CreateProjectPayload } from '../../models/project.model';
import { GeneratedWebsite } from '../../models/website.model';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { FormField } from '../../shared/components/form-field/form-field';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { MAX_PROMPT_LENGTH, buildWebsitePrompt } from '../../shared/utils/build-website-prompt';
import { fieldError } from '../../shared/utils/form-errors';

type Phase = 'idle' | 'generating' | 'saving';

function toPayload(input: CreateProjectInput, prompt: string, site: GeneratedWebsite): CreateProjectPayload {
  const businessName = input.businessName.trim().slice(0, 100);
  return {
    projectName: (input.projectName.trim() || businessName).slice(0, 60),
    businessName,
    businessType: input.businessType,
    prompt,
    html: site.files['index.html'],
    css: site.files['style.css'],
    javascript: site.files['script.js'],
    assets: site.assets,
  };
}

@Component({
  selector: 'app-create-project',
  imports: [ReactiveFormsModule, RouterLink, AppHeader, FormField],
  templateUrl: './create-project.html',
})
export class CreateProject {
  private readonly router = inject(Router);
  private readonly websiteApi = inject(WebsiteApi);
  private readonly projectApi = inject(ProjectApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxPrompt = MAX_PROMPT_LENGTH;
  protected readonly businessTypes = ['Salon', 'Restaurant', 'Gym', 'Clinic', 'Shop', 'Portfolio', 'Other'];

  protected readonly phase = signal<Phase>('idle');
  protected readonly busy = computed(() => this.phase() !== 'idle');
  protected readonly serverError = signal<string | null>(null);
  /** Set when generation worked but saving failed, so "Retry saving" doesn't call the AI again. */
  protected readonly pendingSave = signal<CreateProjectPayload | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    freePrompt: ['', Validators.maxLength(2000)],
    projectName: ['', Validators.maxLength(60)],
    businessType: ['Salon', Validators.required],
    businessName: ['', [Validators.required, Validators.maxLength(100)]],
    address: ['', Validators.maxLength(200)],
    phone: ['', Validators.maxLength(30)],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    services: ['', Validators.maxLength(800)],
    theme: ['', Validators.maxLength(100)],
    colors: ['', Validators.maxLength(100)],
    notes: ['', Validators.maxLength(1000)],
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly promptPreview = computed(() => buildWebsitePrompt(this.value() as CreateProjectInput));

  protected err(name: keyof CreateProjectInput, label: string) {
    return fieldError(this.form.controls[name], label);
  }

  protected submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.pendingSave.set(null);

    const input = this.form.getRawValue();
    const prompt = buildWebsitePrompt(input);

    this.phase.set('generating');
    this.websiteApi
      .generate(prompt)
      .pipe(takeUntilDestroyed(this.destroyRef)) // leaving the page cancels the request
      .subscribe({
        next: (site) => this.save(toPayload(input, prompt, site)),
        error: (err) => this.fail(err, 'Could not generate the website.'),
      });
  }

  protected retrySave(): void {
    const payload = this.pendingSave();
    if (payload && !this.busy()) {
      this.serverError.set(null);
      this.save(payload);
    }
  }

  private save(payload: CreateProjectPayload): void {
    this.phase.set('saving');
    this.projectApi.create(payload).subscribe({
      // The builder loads the saved project: code in the editors, website in the live preview.
      next: (project) => this.router.navigate(['/projects', project.id]),
      error: (err) => {
        this.pendingSave.set(payload);
        this.fail(err, 'The website was generated but could not be saved.');
      },
    });
  }

  private fail(err: unknown, fallback: string): void {
    this.serverError.set(apiErrorMessage(err, fallback));
    this.phase.set('idle');
  }
}