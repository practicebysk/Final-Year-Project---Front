import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectFile } from '../../models/project.model';
import { VersionDetail, VersionSummary } from '../../models/version.model';
import { codeToFiles } from '../../shared/utils/project-mapper';

@Injectable({ providedIn: 'root' })
export class VersionApi {
  private readonly http = inject(HttpClient);

  private url(projectId: string): string {
    return `${environment.apiUrl}/projects/${encodeURIComponent(projectId)}/versions`;
  }

  list(projectId: string): Observable<VersionSummary[]> {
    return this.http
      .get<{ success: boolean; versions: VersionSummary[] }>(this.url(projectId))
      .pipe(map((res) => res.versions));
  }

  get(projectId: string, versionNumber: number): Observable<VersionDetail> {
    return this.http
      .get<{ success: boolean; version: VersionDetail }>(`${this.url(projectId)}/${versionNumber}`)
      .pipe(map((res) => res.version));
  }

  restore(projectId: string, versionNumber: number): Observable<{ version: VersionSummary; files: ProjectFile[] }> {
    return this.http
      .post<{
        success: boolean;
        version: VersionSummary;
        project: { html: string; css: string; javascript: string };
      }>(`${this.url(projectId)}/${versionNumber}/restore`, {})
      .pipe(map((res) => ({ version: res.version, files: codeToFiles(res.project) })));
  }
}