import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FEATURES, GROUPS } from '../../feature-schema';
import { PredictionService } from '../../prediction.service';
import { DataService, ExampleFile } from '../../shared/data.service';

type Transit = { ready: false } | { ready: true; path: string };

/** What the result panel shows: a live answer from Flask or a precomputed gallery entry. */
interface Verdict {
  source: 'live' | 'precomputed';
  prediction: string;
  probability: number;
  disclaimer?: string;
  example?: ExampleFile['examples'][number];
}

@Component({
  selector: 'app-classifier',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './classifier.html',
  styleUrl: './classifier.css',
})
export class Classifier {
  readonly fields = FEATURES;
  readonly groups = GROUPS.map((name) => ({ name, fields: FEATURES.filter((f) => f.group === name) }));
  readonly deployedStatic = !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  values: Record<string, number | string | null> = {};
  readonly loading = signal(false);
  readonly error = signal('');
  readonly verdict = signal<Verdict | null>(null);
  readonly examples = inject(DataService).examples;
  private api = inject(PredictionService);

  constructor() { this.clearValues(); }

  private clearValues() { for (const f of this.fields) this.values[f.name] = null; }

  private num(name: string): number | null {
    const v = this.values[name];
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** Live preview: 3 transits spaced by the period; width = duration / period; depth on a log scale. */
  transit(): Transit {
    const period = this.num('koi_period'), duration = this.num('koi_duration'), depth = this.num('koi_depth');
    if (period === null || duration === null || depth === null) return { ready: false };
    const W = 640, base = 40, spacing = W / 3;
    const centres = [spacing / 2, spacing * 1.5, spacing * 2.5];
    const widthFrac = Math.min(1, duration / 24 / period);
    const half = Math.max(10, Math.min(spacing * 0.42, (widthFrac * spacing) / 2));
    const t = (Math.log10(depth) - Math.log10(50)) / (Math.log10(50000) - Math.log10(50));
    const dip = 18 + Math.max(0, Math.min(1, t)) * 110;
    let d = `M0 ${base}`;
    for (const c of centres) {
      d += ` L${(c - half - 9).toFixed(1)} ${base} L${(c - half).toFixed(1)} ${(base + dip).toFixed(1)}` +
           ` L${(c + half).toFixed(1)} ${(base + dip).toFixed(1)} L${(c + half + 9).toFixed(1)} ${base}`;
    }
    return { ready: true, path: d + ` L${W} ${base}` };
  }

  percent(v: Verdict): number { return Math.round(v.probability * 1000) / 10; }
  isPlanet(v: Verdict): boolean { return v.prediction === 'CONFIRMED'; }

  submit() {
    this.error.set('');
    this.verdict.set(null);
    if (this.deployedStatic) {
      this.error.set('Live prediction needs the local Flask server. On this public site, pick a precomputed example below.');
      return;
    }
    const payload: Record<string, number | null> = {};
    for (const field of this.fields) {
      const value = this.values[field.name];
      if (value === null || value === '') { payload[field.name] = null; continue; }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) { this.error.set(`${field.label} must be a number.`); return; }
      payload[field.name] = numeric;
    }
    this.loading.set(true);
    this.api.predict(payload).subscribe({
      next: (res) => {
        this.verdict.set({ source: 'live', prediction: res.prediction,
          probability: res.confirmed_probability, disclaimer: res.disclaimer });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.status === 0 || err.status === 502 || err.status === 504
          ? 'Cannot reach the model server. Start Flask with "python backend\\app.py", then try again.'
          : `The model server rejected the input (${err.status}): ` + (err.error?.detail || err.error?.error || err.message));
        this.loading.set(false);
      },
    });
  }

  useExample(ex: ExampleFile['examples'][number]) {
    for (const f of this.fields) this.values[f.name] = ex.inputs[f.name] ?? null;
    this.error.set('');
    this.verdict.set({ source: 'precomputed', prediction: ex.prediction,
      probability: ex.confirmed_probability, example: ex });
    document.getElementById('verdict')?.scrollIntoView({ block: 'nearest' });
  }

  clearAll() { this.clearValues(); this.error.set(''); this.verdict.set(null); }
}
