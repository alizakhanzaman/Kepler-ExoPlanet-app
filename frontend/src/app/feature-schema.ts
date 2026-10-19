export type Feature = {
  name: string;
  label: string;
  unit?: string;
  hint?: string;
  group: 'Transit signal' | 'Planet' | 'Host star';
  kind: 'number' | 'category';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
};

// The 11 raw numeric inputs of the Kepler v2 model, in training order.
// required:false -> a blank field is sent as null and imputed by the saved pipeline.
export const FEATURES: Feature[] = [
  { name: 'koi_period', label: 'Orbital period', unit: 'days', hint: '3.17', group: 'Transit signal', kind: 'number', required: false },
  { name: 'koi_impact', label: 'Impact parameter', hint: '0.79', group: 'Transit signal', kind: 'number', required: false },
  { name: 'koi_duration', label: 'Transit duration', unit: 'hours', hint: '1.67', group: 'Transit signal', kind: 'number', required: false },
  { name: 'koi_depth', label: 'Transit depth', unit: 'ppm', hint: '325', group: 'Transit signal', kind: 'number', required: false },
  { name: 'koi_prad', label: 'Planet radius', unit: 'Earth radii', hint: '1.69', group: 'Planet', kind: 'number', required: false },
  { name: 'koi_teq', label: 'Equilibrium temperature', unit: 'K', hint: '1080', group: 'Planet', kind: 'number', required: false },
  { name: 'koi_insol', label: 'Insolation flux', unit: 'Earth flux', hint: '321', group: 'Planet', kind: 'number', required: false },
  { name: 'koi_model_snr', label: 'Signal-to-noise ratio', hint: '20.1', group: 'Transit signal', kind: 'number', required: false },
  { name: 'koi_steff', label: 'Star temperature', unit: 'K', hint: '5431', group: 'Host star', kind: 'number', required: false },
  { name: 'koi_slogg', label: 'Star surface gravity', unit: 'log g', hint: '4.56', group: 'Host star', kind: 'number', required: false },
  { name: 'koi_srad', label: 'Star radius', unit: 'solar radii', hint: '0.84', group: 'Host star', kind: 'number', required: false },
];

export const GROUPS: Feature['group'][] = ['Transit signal', 'Planet', 'Host star'];
