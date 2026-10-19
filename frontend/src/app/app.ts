import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FEATURES, GROUPS, Feature } from './feature-schema';
import { PredictionService, PredictionResponse } from './prediction.service';

type Transit =
  | { ready: false }
  | { ready: true; path: string; dips: number[]; base: number; depthY: number };

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly fields = FEATURES;
  readonly groups = GROUPS.map((name) => ({
    name,
    fields: FEATURES.filter((f) => f.group === name),
  }));
  readonly deployedStatic = !['localhost', '127.0.0.1'].includes(window.location.hostname);

  values: Record<string, number | string | null> = {};
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<PredictionResponse | null>(null);

  private api = inject(PredictionService);

  constructor() {
    this.clearValues();
  }

  private clearValues() {
    for (const field of this.fields) this.values[field.name] = null;
  }

  private num(name: string): number | null {
    const v = this.values[name];
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** Live preview: 3 transits spaced by the orbital period; width = duration / period,
   *  depth drawn on a log scale (50 ppm .. 50,000 ppm). */
  transit(): Transit {
    const period = this.num('koi_period');
    const duration = this.num('koi_duration');
    const depth = this.num('koi_depth');
    if (period === null || duration === null || depth === null) return { ready: false };

    const W = 640, base = 40;
    const spacing = W / 3;
    const centres = [spacing / 2, spacing * 1.5, spacing * 2.5];
    const widthFrac = Math.min(1, duration / 24 / period);
    const half = Math.max(10, Math.min(spacing * 0.42, (widthFrac * spacing) / 2));
    const t = (Math.log10(depth) - Math.log10(50)) / (Math.log10(50000) - Math.log10(50));
    const dipPx = 18 + Math.max(0, Math.min(1, t)) * 110;

    let d = `M0 ${base}`;
    for (const c of centres) {
      d += ` L${(c - half - 9).toFixed(1)} ${base}` +
           ` L${(c - half).toFixed(1)} ${(base + dipPx).toFixed(1)}` +
           ` L${(c + half).toFixed(1)} ${(base + dipPx).toFixed(1)}` +
           ` L${(c + half + 9).toFixed(1)} ${base}`;
    }
    d += ` L${W} ${base}`;
    return { ready: true, path: d, dips: centres, base, depthY: base + dipPx };
  }

  isPlanet(r: PredictionResponse): boolean {
    return r.prediction === 'CONFIRMED';
  }

  percent(r: PredictionResponse): number {
    return Math.round(r.confirmed_probability * 1000) / 10;
  }

  trackField(_i: number, f: Feature) { return f.name; }

  submit() {
    this.error.set('');
    this.result.set(null);

    if (this.deployedStatic) {
      this.error.set('This public page shows the form only. To classify a signal, run Flask and Angular on your computer.');
      return;
    }

    // Blank fields are sent as null; the saved pipeline fills them with training medians.
    const payload: Record<string, number | null> = {};
    for (const field of this.fields) {
      const value = this.values[field.name];
      if (value === null || value === '') {
        if (field.required) {
          this.error.set(`Enter a value for ${field.label}.`);
          return;
        }
        payload[field.name] = null;
        continue;
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        this.error.set(`${field.label} must be a number.`);
        return;
      }
      if ((field.min !== undefined && numeric < field.min) ||
          (field.max !== undefined && numeric > field.max)) {
        this.error.set(`${field.label} is outside the allowed range.`);
        return;
      }
      payload[field.name] = numeric;
    }

    this.loading.set(true);
    this.api.predict(payload).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err) => {
        this.error.set(
          err.status === 0 || err.status === 502 || err.status === 504
            ? 'Cannot reach the model server. Start Flask with "python backend\\app.py", then classify again.'
            : `The model server rejected the input (${err.status}): ` +
              (err.error?.detail || err.error?.error || err.message));
        this.loading.set(false);
      },
    });
  }

  loadSample() {
    const sample: Record<string, number> = {
      koi_period: 3.17059731, koi_impact: 0.793, koi_duration: 1.6686, koi_depth: 325.0,
      koi_prad: 1.69, koi_teq: 1080.0, koi_insol: 321.28, koi_model_snr: 20.1,
      koi_steff: 5431.0, koi_slogg: 4.563, koi_srad: 0.843,
    };
    for (const f of this.fields) this.values[f.name] = sample[f.name] ?? null;
    this.error.set('');
    this.result.set(null);
  }

  clearAll() {
    this.clearValues();
    this.error.set('');
    this.result.set(null);
  }
}
