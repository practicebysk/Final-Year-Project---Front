import { Component, input, output } from '@angular/core';
import { FileName, ProjectFile } from '../../../models/project.model';

@Component({
  selector: 'app-file-tree',
  host: { class: 'block' },
  templateUrl: './file-tree.html',
})
export class FileTree {
  readonly files = input.required<ProjectFile[]>();
  readonly activeFile = input.required<FileName>();
  readonly layout = input<'list' | 'tabs'>('list');
  readonly modified = input<FileName[]>([]); // files with unsaved changes
  readonly fileSelected = output<FileName>();

  protected badge(language: ProjectFile['language']): string {
    return language === 'javascript' ? 'js' : language;
  }
}