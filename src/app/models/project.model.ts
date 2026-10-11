export type FileName = 'index.html' | 'style.css' | 'script.js';

export interface ProjectFile {
  name: FileName;
  language: 'html' | 'css' | 'javascript';
  content: string;
}

/** What the dashboard list needs. */
export interface ProjectSummary {
  id: string;
  name: string;
  businessType: string;
  updatedAt: string; // ISO date
}

/** A fully loaded project (used by the builder). */
export interface Project extends ProjectSummary {
  prompt: string;
  files: ProjectFile[];
}

export interface CreateProjectInput {
  projectName: string; // optional in the form; falls back to the business name
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  services: string; // one per line
  theme: string;
  colors: string;
  notes: string;
  freePrompt: string;
}

/** Body for POST /api/projects. */
export interface CreateProjectPayload {
  projectName: string;
  businessName: string;
  businessType: string;
  prompt: string;
  html: string;
  css: string;
  javascript: string;
  assets: ProjectAsset[];
}

// ---- Shapes returned by the API (MongoDB field names) ----

export interface ProjectAsset {
  name: string;
  url: string;
}

export interface ProjectDto {
  id: string;
  projectName: string;
  businessName: string;
  businessType: string;
  prompt: string;
  html: string;
  css: string;
  javascript: string;
  assets: ProjectAsset[];
  createdAt: string;
  updatedAt: string;
}

/** What the dashboard list needs. */
export interface ProjectSummary {
  id: string;
  name: string;
  businessName: string;
  businessType: string;
  updatedAt: string; // ISO date
}

/** A fully loaded project (used by the builder). */
export interface Project extends ProjectSummary {
  prompt: string;
  assets: ProjectAsset[];
  files: ProjectFile[];
}

export type ProjectSummaryDto = Pick<ProjectDto, 'id' | 'projectName' | 'businessName' | 'businessType' | 'updatedAt'>;