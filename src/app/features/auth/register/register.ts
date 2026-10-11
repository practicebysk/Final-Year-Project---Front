import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { AuthLayout } from '../../../shared/components/auth-layout/auth-layout';
import { FormField } from '../../../shared/components/form-field/form-field';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { fieldError } from '../../../shared/utils/form-errors';

const matchesPassword: ValidatorFn = (control) =>
  control.parent && control.value !== control.parent.get('password')?.value ? { mismatch: true } : null;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, FormField],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required, matchesPassword]],
  });

  constructor() {
    this.form.controls.password.valueChanges.subscribe(() =>
      this.form.controls.confirmPassword.updateValueAndValidity(),
    );
  }

  protected err(name: 'name' | 'email' | 'password' | 'confirmPassword', label: string) {
    return fieldError(this.form.controls[name], label);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.serverError.set(null);

    const { name, email, password } = this.form.getRawValue(); // confirmPassword is not sent
    this.auth.register({ name, email, password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.serverError.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}