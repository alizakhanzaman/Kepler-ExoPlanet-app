import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FEATURES } from './feature-schema';
import { PredictionService, PredictionResponse } from './prediction.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly fields = FEATURES;
  readonly deployedStatic = !['localhost', '127.0.0.1'].includes(window.location.hostname);

  values: Record<string, number | string | null> = {};
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<PredictionResponse | null>(null);

  private api = inject(PredictionService);

  constructor() {
    for (const field of this.fields) this.values[field.name] = null;
  }

  submit() {
    this.error.set('');
    this.result.set(null);

    if (this.deployedStatic) {
      this.error.set('Static GitHub Pages demo: run Angular + Flask locally for predictions.');
      return;
    }

    // Blank fields are sent as null; the saved pipeline fills them with training medians.
    const payload: Record<string, number | null> = {};
    for (const field of this.fields) {
      const value = this.values[field.name];
      if (value === null || value === '') {
        if (field.required) {
          this.error.set(`Enter a value for ${field.label}`);
          return;
        }
        payload[field.name] = null;
        continue;
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        this.error.set(`Invalid number for ${field.label}`);
        return;
      }
      if ((field.min !== undefined && numeric < field.min) ||
          (field.max !== undefined && numeric > field.max)) {
        this.error.set(`Out-of-range value for ${field.label}`);
        return;
      }
      payload[field.name] = numeric;
    }

    this.loading.set(true);
    this.api.predict(payload).subscribe({
      next: (res) => { this.result.set(res); this.loading.set(false); },
      error: (err) => {
        this.error.set(`API error ${err.status || ''}: ` +
          (err.error?.error || err.message || 'Check the Flask terminal'));
        this.loading.set(false);
      },
    });
  }

  fillExample() {
    const example: Record<string, number> = {
      koi_period: 3.17059731, koi_impact: 0.793, koi_duration: 1.6686, koi_depth: 325.0,
      koi_prad: 1.69, koi_teq: 1080.0, koi_insol: 321.28, koi_model_snr: 20.1,
      koi_steff: 5431.0, koi_slogg: 4.563, koi_srad: 0.843,
    };
    for (const f of this.fields) this.values[f.name] = example[f.name] ?? null;
  }
}
