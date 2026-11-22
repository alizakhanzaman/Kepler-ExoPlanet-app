import { Component } from '@angular/core';
import { GAPS, REFS, THEMES } from './references';

@Component({
  selector: 'app-literature',
  templateUrl: './literature.html',
  styleUrl: './literature.css',
})
export class Literature {
  readonly gaps = GAPS;
  readonly groups = THEMES.map((theme) => ({ theme, refs: REFS.filter((r) => r.theme === theme) }));
  readonly total = REFS.length;

  /** In-page jump that does not fight hash routing. */
  jump(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el?.focus({ preventScroll: true });
  }
}
