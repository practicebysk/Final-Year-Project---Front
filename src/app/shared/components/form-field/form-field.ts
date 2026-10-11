import { Component, input } from '@angular/core';

@Component({
  selector: 'app-field',
  templateUrl: './form-field.html',
})
export class FormField {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
}