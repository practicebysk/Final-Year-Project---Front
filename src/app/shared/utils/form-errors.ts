import { AbstractControl } from '@angular/forms';

export function fieldError(control: AbstractControl | null, label: string): string | null {
  if (!control || !control.touched || !control.errors) return null;
  const e = control.errors;
  if (e['required']) return `${label} is required`;
  if (e['email']) return 'Enter a valid email address';
  if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters`;
  if (e['maxlength']) return `${label} is too long`;
  if (e['mismatch']) return 'Passwords do not match';
  return `${label} is invalid`;
}