/**
 * Verified references only. Each entry was checked in this project against Crossref
 * (DOI metadata), the publisher / proceedings page, or the PDF itself.
 */
export interface Ref {
  id: string; authors: string; year: number; title: string; venue: string;
  doi?: string; url?: string; note: string; theme: string;
}

export const THEMES = [
  'Base paper',
  'Kepler mission and the KOI catalogue',
  'Automated vetting (Autovetter / Robovetter)',
  'Deep learning on Kepler light curves',
  'Classical ML on catalogue or light-curve features',
  'Boosted trees, evaluation and explainability',
  'Earth similarity and habitability metrics',
];

export const REFS: Ref[] = [
  { id: 'wang', theme: 'Base paper', authors: 'J. Wang', year: 2024,
    title: 'Using Machine Learning for Exoplanet Classification', venue: 'Research Archive of Rising Scholars, preprint 1021',
    url: 'https://research-archive.org/index.php/rars/preprint/download/1021/1516/1278',
    note: 'scikit-learn MLPClassifier on 11 KOI catalogue features after deleting incomplete rows; 16 layer-size trials, best (300,200,200,100,100) with ROC-AUC 0.91. No baselines, intervals or explainability; CANDIDATE rows are not scored. Year taken from the access dates in its reference list (2024); the preprint page does not state it on the PDF.' },

  { id: 'borucki2010', theme: 'Kepler mission and the KOI catalogue', authors: 'W. J. Borucki et al.', year: 2010,
    title: 'Kepler Planet-Detection Mission: Introduction and First Results', venue: 'Science, 327, 977–980', doi: '10.1126/science.1185402',
    note: 'Mission overview: the photometric transit survey that produced every signal in this dataset.' },
  { id: 'thompson2018', theme: 'Kepler mission and the KOI catalogue', authors: 'S. E. Thompson et al.', year: 2018,
    title: 'Planetary Candidates Observed by Kepler. VIII. A Fully Automated Catalog with Measured Completeness and Reliability Based on Data Release 25',
    venue: 'ApJS, 235, 38', doi: '10.3847/1538-4365/aab4f9',
    note: 'The DR25 KOI catalogue: dispositions produced by the Robovetter with measured completeness and reliability. Source of the labels this project learns from.' },
  { id: 'akeson2013', theme: 'Kepler mission and the KOI catalogue', authors: 'R. L. Akeson et al.', year: 2013,
    title: 'The NASA Exoplanet Archive: Data and Tools for Exoplanet Research', venue: 'PASP, 125, 989–999', doi: '10.1086/672273',
    note: 'The archive whose KOI cumulative table is queried live to check the candidate ranking.' },

  { id: 'mccauliff2015', theme: 'Automated vetting (Autovetter / Robovetter)', authors: 'S. D. McCauliff et al.', year: 2015,
    title: 'Automatic Classification of Kepler Planetary Transit Candidates', venue: 'ApJ, 806, 6', doi: '10.1088/0004-637X/806/1/6',
    note: 'The Autovetter: a random-forest classifier over pipeline-derived signal attributes. An early precedent for tree ensembles on Kepler features.' },
  { id: 'coughlin2016', theme: 'Automated vetting (Autovetter / Robovetter)', authors: 'J. L. Coughlin et al.', year: 2016,
    title: 'Planetary Candidates Observed by Kepler. VII. The First Fully Uniform Catalog Based on the Entire 48-month Data Set (Q1–Q17 DR24)',
    venue: 'ApJS, 224, 12', doi: '10.3847/0067-0049/224/1/12',
    note: 'DR24 catalogue built with the rule-based Robovetter, the vetting approach later refined for DR25.' },

  { id: 'shallue2018', theme: 'Deep learning on Kepler light curves', authors: 'C. J. Shallue and A. Vanderburg', year: 2018,
    title: 'Identifying Exoplanets with Deep Learning: A Five-planet Resonant Chain around Kepler-80 and an Eighth Planet around Kepler-90',
    venue: 'AJ, 155, 94', doi: '10.3847/1538-3881/aa9e09',
    note: 'AstroNet: a convolutional network on phase-folded light curves. Works on the raw signal rather than catalogue values, which this project does not use.' },

  { id: 'armstrong2021', theme: 'Classical ML on catalogue or light-curve features', authors: 'D. J. Armstrong, J. Gamper and T. Damoulas', year: 2021,
    title: 'Exoplanet validation with machine learning: 50 new validated Kepler planets', venue: 'MNRAS, 504, 5327–5344', doi: '10.1093/mnras/staa2498',
    note: 'Probabilistic ML classifiers used to statistically validate Kepler candidates; motivates scoring CANDIDATE rows and attention to calibration.' },
  { id: 'malik2022', theme: 'Classical ML on catalogue or light-curve features', authors: 'A. Malik, B. P. Moster and C. Obermeier', year: 2022,
    title: 'Exoplanet detection using machine learning', venue: 'MNRAS, 513, 5505–5516', doi: '10.1093/mnras/stab3692',
    note: 'Extracts time-series features from light curves and classifies them with LightGBM, competitive with deep learning at lower cost.' },
  { id: 'breiman2001', theme: 'Classical ML on catalogue or light-curve features', authors: 'L. Breiman', year: 2001,
    title: 'Random Forests', venue: 'Machine Learning, 45, 5–32', doi: '10.1023/A:1010933404324',
    note: 'Random forests, one of the baselines here, and the origin of permutation importance.' },

  { id: 'chen2016', theme: 'Boosted trees, evaluation and explainability', authors: 'T. Chen and C. Guestrin', year: 2016,
    title: 'XGBoost: A Scalable Tree Boosting System', venue: 'Proc. 22nd ACM SIGKDD, 785–794', doi: '10.1145/2939672.2939785',
    note: 'Gradient-boosted trees; a top model in the comparison here.' },
  { id: 'ke2017', theme: 'Boosted trees, evaluation and explainability', authors: 'G. Ke et al.', year: 2017,
    title: 'LightGBM: A Highly Efficient Gradient Boosting Decision Tree', venue: 'Advances in Neural Information Processing Systems 30',
    url: 'https://papers.nips.cc/paper_files/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html',
    note: 'The deployed model family, selected by cross-validated PR-AUC.' },
  { id: 'lundberg2017', theme: 'Boosted trees, evaluation and explainability', authors: 'S. M. Lundberg and S.-I. Lee', year: 2017,
    title: 'A Unified Approach to Interpreting Model Predictions', venue: 'Advances in Neural Information Processing Systems 30',
    url: 'https://papers.nips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html',
    note: 'SHAP values, used in the training notebook alongside permutation importance.' },
  { id: 'pedregosa2011', theme: 'Boosted trees, evaluation and explainability', authors: 'F. Pedregosa et al.', year: 2011,
    title: 'Scikit-learn: Machine Learning in Python', venue: 'JMLR, 12, 2825–2830', url: 'https://jmlr.org/papers/v12/pedregosa11a.html',
    note: 'The library behind the base paper\'s MLP, the pipeline, and the replication.' },
  { id: 'saito2015', theme: 'Boosted trees, evaluation and explainability', authors: 'T. Saito and M. Rehmsmeier', year: 2015,
    title: 'The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets',
    venue: 'PLOS ONE, 10, e0118432', doi: '10.1371/journal.pone.0118432',
    note: 'Why PR-AUC, not only ROC-AUC, is used when only 31% of labels are CONFIRMED.' },
  { id: 'efron1979', theme: 'Boosted trees, evaluation and explainability', authors: 'B. Efron', year: 1979,
    title: 'Bootstrap Methods: Another Look at the Jackknife', venue: 'Annals of Statistics, 7, 1–26', doi: '10.1214/aos/1176344552',
    note: 'The bootstrap behind the 95% confidence intervals on the hold-out metrics.' },

  { id: 'schulze2011', theme: 'Earth similarity and habitability metrics', authors: 'D. Schulze-Makuch et al.', year: 2011,
    title: 'A Two-Tiered Approach to Assessing the Habitability of Exoplanets', venue: 'Astrobiology, 11, 1041–1052', doi: '10.1089/ast.2010.0592',
    note: 'Introduces the Earth Similarity Index (from radius, density, escape velocity and surface temperature) and a Planetary Habitability Index. The ESS here borrows its similarity form only.' },
  { id: 'phl', theme: 'Earth similarity and habitability metrics', authors: 'Planetary Habitability Laboratory, Univ. of Puerto Rico at Arecibo', year: 2025,
    title: 'Earth Similarity Index (ESI)', venue: 'Web page', url: 'https://phl.upr.edu/projects/earth-similarity-index-esi',
    note: 'Documents a later ESI variant for exoplanets from stellar flux and radius, used in the Habitable Worlds Catalog. The ESS is closest to this variant. Year is the access year.' },
  { id: 'kopparapu2013', theme: 'Earth similarity and habitability metrics', authors: 'R. K. Kopparapu et al.', year: 2013,
    title: 'Habitable Zones around Main-sequence Stars: New Estimates', venue: 'ApJ, 765, 131', doi: '10.1088/0004-637X/765/2/131',
    note: 'Climate-model habitable-zone limits in terms of stellar flux; planned as a physically grounded alternative to ESS.' },
];

export const GAPS = [
  { aspect: 'Unit of output', paper: 'Binary label per signal', lit: 'Binary label or validation probability (Armstrong et al. 2021)', ours: 'Probability plus ranked follow-up list (p × ESS, Pareto front)' },
  { aspect: 'CANDIDATE signals', paper: 'Discarded', lit: 'Scored in validation work, rarely ranked by Earth-likeness', ours: 'All 2,248 scored and ranked' },
  { aspect: 'Baselines', paper: 'None (one MLP)', lit: 'Common in ML papers (Malik et al. 2022)', ours: 'Five model families on identical splits' },
  { aspect: 'Uncertainty', paper: 'None', lit: 'Varies', ours: 'Repeated CV, bootstrap 95% CIs' },
  { aspect: 'Explainability', paper: 'None', lit: 'SHAP / importance (Lundberg and Lee 2017)', ours: 'Permutation importance, SHAP in the notebook' },
  { aspect: 'Earth similarity', paper: 'Not considered', lit: 'ESI defined for known planets (Schulze-Makuch et al. 2011)', ours: 'ESI-inspired ESS combined with classifier confidence' },
  { aspect: 'External validation', paper: 'None', lit: 'Follow-up observations', ours: 'Ranking checked against live NASA archive dispositions' },
  { aspect: 'Reproducible delivery', paper: 'Paper only', lit: 'Code releases sometimes', ours: 'Tested API, website, CI/CD' },
];
