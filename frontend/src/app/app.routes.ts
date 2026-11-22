import { Routes } from '@angular/router';

const suffix = ' | Kepler Exoplanet Prioritiser';

export const routes: Routes = [
  { path: '', pathMatch: 'full', title: 'Home' + suffix,
    loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  { path: 'classifier', title: 'Classifier' + suffix,
    loadComponent: () => import('./pages/classifier/classifier').then((m) => m.Classifier) },
  { path: 'results', title: 'Results' + suffix,
    loadComponent: () => import('./pages/results/results').then((m) => m.Results) },
  { path: 'novelty', title: 'Novelty' + suffix,
    loadComponent: () => import('./pages/novelty/novelty').then((m) => m.Novelty) },
  { path: 'prioritisation', title: 'Prioritisation' + suffix,
    loadComponent: () => import('./pages/prioritisation/prioritisation').then((m) => m.Prioritisation) },
  { path: 'literature', title: 'Literature' + suffix,
    loadComponent: () => import('./pages/literature/literature').then((m) => m.Literature) },
  { path: 'pipeline', title: 'Pipeline' + suffix,
    loadComponent: () => import('./pages/pipeline/pipeline').then((m) => m.Pipeline) },
  { path: 'about', title: 'About' + suffix,
    loadComponent: () => import('./pages/about/about').then((m) => m.About) },
  { path: '**', redirectTo: '' },
];
