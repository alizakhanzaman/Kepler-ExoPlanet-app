import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService, valueOf } from '../../shared/data.service';

@Component({
  selector: 'app-novelty',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './novelty.html',
  styleUrl: './novelty.css',
})
export class Novelty {
  readonly res = inject(DataService).results;
  readonly p = computed(() => valueOf(this.res)?.prioritisation);
  readonly rep = computed(() => valueOf(this.res)?.replication.rows);

  readonly planned = [
    { title: 'Light-curve features', text: 'Add features computed from the Kepler light curves themselves (for example with a feature-extraction library) instead of catalogue values only, and test whether the ranking changes.' },
    { title: 'Probability calibration', text: 'Calibrate p_planet (isotonic or Platt) and report reliability diagrams, so the probability in the priority score can be read literally.' },
    { title: '36-feature research model', text: 'Report a prioritisation run with the 36-feature model, which scores higher in cross-validation, while the web demo keeps 11 typed inputs.' },
    { title: 'Physically grounded similarity', text: 'Replace the two-parameter ESS with habitable-zone distance (Kopparapu et al. 2013 limits) and compare the two shortlists.' },
    { title: 'Repeat the NASA check over time', text: 'Re-run the live archive check periodically and track how many shortlisted candidates are resolved and how.' },
  ];
}
