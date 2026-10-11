import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is it running?';
    const message = err.error?.message;
    if (typeof message === 'string' && message) return message;
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return 'The AI took too long to respond. Please try again.';
  }
  return fallback;
}