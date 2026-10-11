import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

// Up to 30 images at 10 s each, 4 at a time, plus packaging.
const EXPORT_TIMEOUT_MS = 150_000;

export interface ExportInput {
  html: string;
  css: string;
  javascript: string;
  includeAssets: boolean;
}

export interface ExportResult {
  blob: Blob;
  included: number; // images saved inside the ZIP
  skipped: number; // images that stay online links
}

@Injectable({ providedIn: 'root' })
export class ExportApi {
  private readonly http = inject(HttpClient);

  download(projectId: string, input: ExportInput): Observable<ExportResult> {
    return this.http
      .post(`${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/export`, input, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        timeout(EXPORT_TIMEOUT_MS),
        map((res) => ({
          blob: res.body as Blob,
          included: Number(res.headers.get('X-Assets-Included') ?? 0),
          skipped: Number(res.headers.get('X-Assets-Skipped') ?? 0),
        })),
        catchError((err) => this.readBlobError(err)),
      );
  }

  // With responseType 'blob', error bodies arrive as a Blob. Parse the JSON so apiErrorMessage() works.
  private readBlobError(err: unknown): Observable<never> {
    if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
      return from(err.error.text()).pipe(
        map((text) => {
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return null;
          }
        }),
        switchMap((body) =>
          throwError(() => new HttpErrorResponse({ error: body, status: err.status, statusText: err.statusText, url: err.url ?? undefined })),
        ),
      );
    }
    return throwError(() => err);
  }
}