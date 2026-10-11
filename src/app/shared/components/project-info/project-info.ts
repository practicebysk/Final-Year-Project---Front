import { Component, input } from '@angular/core';
import { Project } from '../../../models/project.model';

@Component({
  selector: 'app-project-info',
  host: { class: 'block' },
  templateUrl: './project-info.html',
})
export class ProjectInfo {
  readonly project = input.required<Project>();
}