# Evidence record

Fill in the blanks (____) with your own links, then add the screenshots to this folder.

## Environment

| Item | Value |
|---|---|
| OS | Windows |
| Python | 3.12.10 |
| Node.js / npm | 24.15.0 / 11.12.1 |
| Git | 2.53.0 |
| Angular CLI | ____ (run `ng version`) |
| Model libraries | scikit-learn 1.6.1, LightGBM 4.6.0, NumPy 2.1.3, pandas 2.2.3 |

## Links

- Repository: https://github.com/alizakhanzaman/Kepler-ExoPlanet-app
- Passing CI run: ____
- Passing Pages deployment run: ____
- Live static page: https://alizakhanzaman.github.io/Kepler-ExoPlanet-app/

## Screenshots to save in docs/

1. `01-pytest-pass.png` - `python -m pytest -q backend\tests` showing all tests passed
2. `02-api-predict.png` - `curl` call to `/predict` returning `CONFIRMED`
3. `03-local-result.png` - Angular form at localhost:4200 with a result
4. `04-ci-green.png` - GitHub Actions CI run, both jobs green
5. `05-pages-live.png` - public page with the "form only" notice and disabled button

## Troubleshooting log

| # | Command / step | Folder | Problem | Cause | Fix |
|---|---|---|---|---|---|
| 1 | `git add .github/workflows/pages.yml` | `C:\ml_project\frontend` | `pathspec ... did not match any files` | Command run inside `frontend`, not the project root | `cd C:\ml_project`, then repeat |
| 2 | Open Pages URL | n/a | Page did not open | Repository is named `Kepler-ExoPlanet-app`; Pages path is case-sensitive and the build used a hard-coded `-App` base href | Use `${{ github.event.repository.name }}` in `pages.yml` and the correct URL |
| 3 | Model packaging | `C:\ml_project` | Saved v1 pipeline had no imputer | Median imputation happened outside the pipeline | Switched to v2, which saves imputer + scaler + model in one pipeline |
