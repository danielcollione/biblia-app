export type CelestialParticle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; alpha: number;
  hueShift: number;
  kind: 'trail' | 'ember';
};