import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectSummary } from '../../../models/project.model';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink, DatePipe],
  templateUrl: './project-card.html',
})
export class ProjectCard {
  readonly project = input.required<ProjectSummary>();
  readonly duplicating = input(false);

  readonly renameRequested = output<ProjectSummary>();
  readonly duplicateRequested = output<ProjectSummary>();
  readonly deleteRequested = output<ProjectSummary>();

  protected readonly initials = computed(() =>
    this.project().name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
  );
}