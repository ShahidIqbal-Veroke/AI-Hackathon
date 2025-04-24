import { Component } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HomeComponent],
  template: `
    <div class="app-container">
      <app-home></app-home>
    </div>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {}
