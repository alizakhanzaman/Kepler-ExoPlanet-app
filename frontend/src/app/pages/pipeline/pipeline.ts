import { Component } from '@angular/core';

@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.css',
})
export class Pipeline {
  readonly cicd = [
    { title: 'Code', sub: 'Angular + Flask + research scripts', x: 10 },
    { title: 'git push', sub: 'to main on GitHub', x: 200 },
    { title: 'CI', sub: 'pytest (6 tests) + ng build', x: 390 },
    { title: 'CD', sub: 'ng build --base-href, upload', x: 580 },
    { title: 'GitHub Pages', sub: 'static site, hash routes', x: 770 },
  ];
  readonly arch = [
    { title: 'Angular site', sub: 'standalone, zoneless, signals', x: 10 },
    { title: '/api proxy', sub: 'ng serve proxy.conf.json', x: 245 },
    { title: 'Flask API', sub: 'GET /health, POST /predict', x: 480 },
    { title: 'Model bundle', sub: 'imputer → scaler → LightGBM', x: 715 },
  ];
}
