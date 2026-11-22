import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService, valueOf } from '../../shared/data.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private data = inject(DataService);
  readonly results = this.data.results;

  readonly lgb = computed(() => valueOf(this.results)?.holdout.find((h) => h.name === 'LightGBM'));
  readonly prio = computed(() => valueOf(this.results)?.prioritisation);
  readonly rep = computed(() => valueOf(this.results)?.replication.rows[1]);

  /** Transit light curve used by the hero: flat, smooth ingress, flat bottom, egress. */
  readonly curve = 'M0 60 L250 60 C268 60 272 104 292 104 L428 104 C448 104 452 60 470 60 L720 60';
}
