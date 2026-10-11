import { Project, ProjectDto, ProjectFile, ProjectSummary, ProjectSummaryDto } from '../../models/project.model';

export function toSummary(dto: ProjectSummaryDto): ProjectSummary {
  return {
    id: dto.id,
    name: dto.projectName,
    businessName: dto.businessName,
    businessType: dto.businessType,
    updatedAt: dto.updatedAt,
  };
}

export function toProject(dto: ProjectDto): Project {
  return {
    ...toSummary(dto),
    prompt: dto.prompt,
    assets: dto.assets ?? [],
    files: codeToFiles(dto)
  };
}

export function filesToCode(files: ProjectFile[]): { html: string; css: string; javascript: string } {
  const get = (name: ProjectFile['name']) => files.find((f) => f.name === name)?.content ?? '';
  return { html: get('index.html'), css: get('style.css'), javascript: get('script.js') };
}

export function codeToFiles(code: { html: string; css: string; javascript: string }): ProjectFile[] {
  return [
    { name: 'index.html', language: 'html', content: code.html },
    { name: 'style.css', language: 'css', content: code.css },
    { name: 'script.js', language: 'javascript', content: code.javascript },
  ];
}