import { ProjectFile } from './project.model';

export type VersionSource = 'initial' | 'ai' | 'restore' | 'snapshot';

export interface VersionSummary {
  id: string;
  versionNumber: number;
  label: string;
  source: VersionSource;
  createdAt: string; // ISO date
}

/** A version including its code (used for the preview). */
export interface VersionDetail extends VersionSummary {
  html: string;
  css: string;
  javascript: string;
}

export interface RestoredEvent {
  restoredFrom: number;
  version: VersionSummary;
  files: ProjectFile[];
}