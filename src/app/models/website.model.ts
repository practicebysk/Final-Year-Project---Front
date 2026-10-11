import { ProjectAsset } from './project.model';
import { VersionSummary } from './version.model';

export interface WebsiteFiles {
  'index.html': string;
  'style.css': string;
  'script.js': string;
}

/** Validated result returned by POST /api/websites/generate. */
export interface GeneratedWebsite {
  project: { projectName: string; businessName: string; businessType: string };
  files: WebsiteFiles;
  assets: ProjectAsset[];
}

export interface ModifyWebsiteInput {
  projectId: string;
  existingHtml: string;
  existingCss: string;
  existingJavaScript: string;
  userRequest: string;
}

export interface ModifiedWebsite {
  files: WebsiteFiles;
  assets: ProjectAsset[];
  summary: string;
  version: VersionSummary;
}