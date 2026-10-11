import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProjectPayload,
  Project,
  ProjectDto,
  ProjectFile,
  ProjectSummary,
  ProjectSummaryDto,
} from '../../models/project.model';
import { filesToCode, toProject, toSummary } from '../../shared/utils/project-mapper';

interface ProjectResponse {
  success: boolean;
  project: ProjectDto;
}
interface ProjectListResponse {
  success: boolean;
  projects: ProjectSummaryDto[];
}

@Injectable({ providedIn: 'root' })
export class ProjectApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  list(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectListResponse>(this.baseUrl).pipe(map((res) => res.projects.map(toSummary)));
  }

  /** Emits undefined when the project doesn't exist or belongs to someone else (404). */
  getById(id: string): Observable<Project | undefined> {
    return this.http.get<ProjectResponse>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(
      map((res) => toProject(res.project)),
      catchError((err) =>
        err instanceof HttpErrorResponse && err.status === 404 ? of(undefined) : throwError(() => err),
      ),
    );
  }

  create(payload: CreateProjectPayload): Observable<Project> {
    return this.http.post<ProjectResponse>(this.baseUrl, payload).pipe(map((res) => toProject(res.project)));
  }

  saveFiles(id: string, files: ProjectFile[]): Observable<void> {
    return this.http
      .put<ProjectResponse>(`${this.baseUrl}/${encodeURIComponent(id)}`, filesToCode(files))
      .pipe(map((): void => undefined));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ success: boolean }>(`${this.baseUrl}/${encodeURIComponent(id)}`)
      .pipe(map((): void => undefined));
  }

  /** Renames a project and returns its updated summary. */
  rename(id: string, projectName: string): Observable<ProjectSummary> {
    return this.http
      .put<ProjectResponse>(`${this.baseUrl}/${encodeURIComponent(id)}`, { projectName })
      .pipe(map((res) => toSummary(res.project)));
  }

  /** The server copies the stored project and returns the copy's summary. */
  duplicate(id: string): Observable<ProjectSummary> {
    return this.http
      .post<ProjectResponse>(`${this.baseUrl}/${encodeURIComponent(id)}/duplicate`, {})
      .pipe(map((res) => toSummary(res.project)));
  }
}