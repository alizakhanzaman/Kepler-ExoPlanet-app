import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Starfield } from './shared/starfield';

export const NAV = [
  { path: '/', label: 'Home', exact: true },
  { path: '/classifier', label: 'Classifier', exact: false },
  { path: '/results', label: 'Results', exact: false },
  { path: '/novelty', label: 'Novelty', exact: false },
  { path: '/prioritisation', label: 'Prioritisation', exact: false },
  { path: '/literature', label: 'Literature', exact: false },
  { path: '/pipeline', label: 'Pipeline', exact: false },
  { path: '/about', label: 'About', exact: false },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Starfield],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly nav = NAV;
  readonly menuOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly repo = 'https://github.com/alizakhanzaman/Kepler-ExoPlanet-app';

  constructor() {
    inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.menuOpen.set(false);
        // Move focus to the main region so screen-reader users land on the new page.
        queueMicrotask(() => document.getElementById('main')?.focus({ preventScroll: true }));
      }
    });
  }

  toggleMenu() { this.menuOpen.update((v) => !v); }
}
