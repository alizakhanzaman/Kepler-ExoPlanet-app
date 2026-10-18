export type Feature = {
  name: string;
  label: string;
  kind: 'number' | 'category';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
};

// The 11 raw numeric inputs of the Kepler v2 model, in training order.
// required:false -> blank is sent as null and imputed by the saved pipeline.
export const FEATURES: Feature[] = [
  { name: 'koi_period', label: 'Orbital period (days)', kind: 'number', required: false },
  { name: 'koi_impact', label: 'Impact parameter', kind: 'number', required: false },
  { name: 'koi_duration', label: 'Transit duration (hours)', kind: 'number', required: false },
  { name: 'koi_depth', label: 'Transit depth (ppm)', kind: 'number', required: false },
  { name: 'koi_prad', label: 'Planet radius (Earth radii)', kind: 'number', required: false },
  { name: 'koi_teq', label: 'Equilibrium temperature (K)', kind: 'number', required: false },
  { name: 'koi_insol', label: 'Insolation flux (Earth flux)', kind: 'number', required: false },
  { name: 'koi_model_snr', label: 'Transit signal-to-noise', kind: 'number', required: false },
  { name: 'koi_steff', label: 'Star temperature (K)', kind: 'number', required: false },
  { name: 'koi_slogg', label: 'Star surface gravity (log g)', kind: 'number', required: false },
  { name: 'koi_srad', label: 'Star radius (solar radii)', kind: 'number', required: false },
];
