import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GeneratedWebsite, ModifiedWebsite, ModifyWebsiteInput } from '../../models/website.model';

// Server allows 90 s per Gemini call plus retries. HttpClient has no timeout of its own.
const AI_TIMEOUT_MS = 210_000;

interface GenerateResponse extends GeneratedWebsite {
  success: boolean;
}
interface ModifyResponse extends ModifiedWebsite {
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebsiteApi {
  private readonly http = inject(HttpClient);

  /** Calls our own server, which calls Gemini. The API key never reaches the browser. */
  generate(prompt: string): Observable<GeneratedWebsite> {
    return this.http.post<GenerateResponse>(`${environment.apiUrl}/websites/generate`, { prompt }).pipe(
      timeout(AI_TIMEOUT_MS),
      map(({ project, files, assets }) => ({ project, files, assets })),
    );
  }

  modify(input: ModifyWebsiteInput): Observable<ModifiedWebsite> {
    return this.http.post<ModifyResponse>(`${environment.apiUrl}/websites/modify`, input).pipe(
      timeout(AI_TIMEOUT_MS),
    map(({ files, assets, summary, version }) => ({ files, assets, summary, version })),
    );
  }
}