import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DataService, FEATURE_LABELS } from '../../shared/data.service';

@Component({
  selector: 'app-results',
  imports: [DecimalPipe],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results {
  readonly res = inject(DataService).results;
  readonly labels = FEATURE_LABELS;

  /** Heatmap colour: violet (low) -> magenta -> gold (high) over the observed F1 range. */
  readonly heat = computed(() => {
    const r = this.res.value();
    if (!r) return null;
    const all = r.cv_f1.flatMap((m) => m.f1);
    const lo = Math.min(...all), hi = Math.max(...all);
    const stops = [[124, 58, 237], [219, 39, 119], [255, 212, 121]];
    const colour = (v: number) => {
      const t = (v - lo) / (hi - lo || 1);
      const [a, b, f] = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
      const c = a.map((x, i) => Math.round(x + (b[i] - x) * f));
      return { fill: `rgb(${c.join(',')})`, dark: t > 0.62 };
    };
    return { lo, hi, rows: r.cv_f1.map((m) => ({ name: m.name, cells: m.f1.map((v) => ({ v, ...colour(v) })) })) };
  });

  readonly cm = computed(() => {
    const m = this.res.value()?.confusion_matrix;
    if (!m) return null;
    const max = Math.max(...m.flat());
    const cells = [
      { r: 0, c: 0, v: m[0][0], label: 'True negative', good: true },
      { r: 0, c: 1, v: m[0][1], label: 'False alarm', good: false },
      { r: 1, c: 0, v: m[1][0], label: 'Missed planet', good: false },
      { r: 1, c: 1, v: m[1][1], label: 'True positive', good: true },
    ];
    return cells.map((x) => ({ ...x, alpha: 0.18 + 0.62 * (x.v / max) }));
  });

  /** Threshold chart geometry: x = threshold 0..1, y = metric 0.4..1. */
  readonly thr = computed(() => {
    const t = this.res.value()?.thresholds;
    if (!t) return null;
    const W = 560, H = 260, L = 44, B = 32, T = 12, R = 12;
    const x = (v: number) => L + v * (W - L - R);
    const y = (v: number) => T + (1 - (v - 0.4) / 0.6) * (H - T - B);
    const line = (k: 'precision' | 'recall' | 'f1') =>
      t.curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(Math.max(0.4, p[k])).toFixed(1)}`).join(' ');
    return {
      W, H, L, B, T, R, x, y,
      precision: line('precision'), recall: line('recall'), f1: line('f1'),
      xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0.4, 0.6, 0.8, 1],
      marks: [t.default, t.high_precision], source: t.curve_source,
    };
  });

  readonly imp = computed(() => {
    const list = this.res.value()?.importance;
    if (!list) return null;
    const max = Math.max(...list.map((d) => d.drop));
    return list.map((d) => ({ ...d, w: (d.drop / max) * 100, label: this.labels[d.feature] ?? d.feature }));
  });

  readonly sweep = computed(() => {
    const s = this.res.value()?.replication.sweep;
    if (!s?.length) return null;
    const W = 560, H = 230, L = 44, B = 34, T = 10, R = 10;
    const n = s.length;
    const x = (i: number) => L + (i + 0.5) * ((W - L - R) / n);
    const y = (v: number) => T + (1 - (v - 0.75) / 0.25) * (H - T - B);
    const path = (k: 'roc_auc' | 'paper_roc_auc') => s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(' ');
    return { W, H, L, B, T, R, x, y, rows: s, ours: path('roc_auc'), paper: path('paper_roc_auc'), yticks: [0.75, 0.8, 0.85, 0.9, 0.95, 1] };
  });

  best(values: number[], v: number) { return v === Math.max(...values); }
  maxBy(rows: { f1: number }[]) { return Math.max(...rows.map((r) => r.f1)); }
}
