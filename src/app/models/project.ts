export type FileName = 'index.html' | 'style.css' | 'script.js';

export interface ProjectFile {
  name: FileName;
  language: 'html' | 'css' | 'javascript';
  content: string;
}

export interface Project {
  id: string;
  name: string;
  businessType: string;
  prompt: string;
  updatedAt: string; // ISO date
  files: ProjectFile[];
}

export interface CreateProjectInput {
  projectName: string;
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  services: string; // one per line
  theme: string;
  notes: string;
}