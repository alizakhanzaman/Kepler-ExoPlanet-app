import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Candidate, DataService } from '../../shared/data.service';

type SortKey = 'rank' | 'kepoi_name' | 'koi_prad' | 'koi_insol' | 'koi_period' | 'p_planet' | 'ess' | 'priority';

@Component({
  selector: 'app-prioritisation',
  imports: [DecimalPipe],
  templateUrl: './prioritisation.html',
  styleUrl: './prioritisation.css',
})
export class Prioritisation {
  readonly file = inject(DataService).candidates;

  readonly query = signal('');
  readonly minP = signal(0);
  readonly minEss = signal(0);
  readonly paretoOnly = signal(false);
  readonly sortKey = signal<SortKey>('rank');
  readonly sortAsc = signal(true);
  readonly pageSize = signal(25);

  readonly columns: { key: SortKey; label: string; num: boolean }[] = [
    { key: 'rank', label: 'Rank', num: true },
    { key: 'kepoi_name', label: 'KOI', num: false },
    { key: 'koi_prad', label: 'Radius (R⊕)', num: true },
    { key: 'koi_insol', label: 'Insolation (S⊕)', num: true },
    { key: 'koi_period', label: 'Period (d)', num: true },
    { key: 'p_planet', label: 'p_planet', num: true },
    { key: 'ess', label: 'ESS', num: true },
    { key: 'priority', label: 'Priority', num: true },
  ];

  readonly rows = computed<Candidate[]>(() => {
    const f = this.file.value();
    if (!f) return [];
    const q = this.query().trim().toLowerCase();
    const k = this.sortKey(), dir = this.sortAsc() ? 1 : -1;
    return f.top
      .filter((c) => (!q || c.kepoi_name.toLowerCase().includes(q) || (c.kepler_name ?? '').toLowerCase().includes(q))
        && c.p_planet >= this.minP() && c.ess >= this.minEss() && (!this.paretoOnly() || c.pareto))
      .sort((a, b) => {
        const x = a[k] ?? -Infinity, y = b[k] ?? -Infinity;
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
  });
  readonly visible = computed(() => this.rows().slice(0, this.pageSize()));

  /** Scatter geometry: x = p_planet, y = ESS (0..1 each). */
  readonly plot = computed(() => {
    const f = this.file.value();
    if (!f) return null;
    const W = 640, H = 400, L = 50, B = 42, T = 14, R = 16;
    const x = (v: number) => L + v * (W - L - R);
    const y = (v: number) => T + (1 - v) * (H - T - B);
    const front = [...f.pareto_front].sort((a, b) => a.p_planet - b.p_planet);
    const step = front.map((c, i) => `${i ? 'L' : 'M'}${x(c.p_planet).toFixed(1)} ${y(c.ess).toFixed(1)}`).join(' ');
    const pts = f.scatter.map(([p, e, par]) => ({ cx: x(p).toFixed(1), cy: y(e).toFixed(1), par }));
    // iso-priority curves p * ESS = c
    const iso = [0.2, 0.4, 0.6].map((c) => {
      const d: string[] = [];
      for (let p = c; p <= 1.0001; p += 0.02) d.push(`${d.length ? 'L' : 'M'}${x(p).toFixed(1)} ${y(Math.min(1, c / p)).toFixed(1)}`);
      return { c, d: d.join(' '), lx: x(1) - 4, ly: y(c) - 4 };
    });
    return { W, H, L, B, T, R, x, y, pts: pts.filter((p) => !p.par), front, step, iso, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] };
  });

  sortBy(k: SortKey) {
    if (this.sortKey() === k) this.sortAsc.update((v) => !v);
    else { this.sortKey.set(k); this.sortAsc.set(k === 'rank' || k === 'kepoi_name'); }
  }
  ariaSort(k: SortKey) { return this.sortKey() !== k ? 'none' : this.sortAsc() ? 'ascending' : 'descending'; }
  num(e: Event) { return Number((e.target as HTMLInputElement).value); }
  reset() { this.query.set(''); this.minP.set(0); this.minEss.set(0); this.paretoOnly.set(false); this.sortKey.set('rank'); this.sortAsc.set(true); }
  cell(c: Candidate, k: SortKey) { return c[k]; }
}
