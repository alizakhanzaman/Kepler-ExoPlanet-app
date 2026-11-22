import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.html',
  styles: [`.lim { padding-left: 20px; display: grid; gap: 10px; color: var(--soft); margin: 0; } .lim strong { color: #fff; }`],
})
export class About {
  readonly repo = 'https://github.com/alizakhanzaman/Kepler-ExoPlanet-app';
}
