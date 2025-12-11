// ============================================
// CONFIGURATION
// ============================================
export const CONFIG = {
  booster: {
    width: 2.4,
    height: 3.4,
    depth: 0.06,
    bevelSize: 0.02,
  },

  card: {
    width: 2.0,
    height: 2.8,
    depth: 0.025,
    bevelSize: 0.008,
  },

  tilt: {
    maxAngle: 0.18,
    lerpFactor: 0.06,
    returnFactor: 0.04,
    damping: 0.92,
  },

  drag: {
    sensitivity: 0.008,
    inertia: 0.95,
    returnSpeed: 0.02,
  },

  timing: {
    boosterShake: 0.35,
    boosterTear: 0.5,
    boosterFade: 0.3,
    cardAppear: 0.4,
    cardFlip: 0.45,
    cardSlide: 0.35,
    cardStagger: 0.06,
  },

  easing: {
    smooth: t => 1 - Math.pow(1 - t, 4),
    inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    outBack: t => {
      const c = 1.4;
      return 1 + c * Math.pow(t - 1, 3) + (c - 1) * Math.pow(t - 1, 2);
    },
    inBack: t => {
      const c = 1.70158;
      return c * t * t * t - (c - 1) * t * t;
    },
  },

  bloom: {
    intensity: 0.4,
    luminanceThreshold: 0.8,
    luminanceSmoothing: 0.3,
  },
};

export const CARDS_DATA = [
  { name: 'BIGFLO', subtitle: 'Le Lyriciste', rarity: 'legendary', hp: 200, colors: ['#D4AF37', '#B8860B'], type: 'OR' },
  { name: 'JUL', subtitle: 'Le Prolifique', rarity: 'epic', hp: 180, colors: ['#8B5CF6', '#A855F7'], type: 'OVNI' },
  { name: 'NEKFEU', subtitle: 'Le Poète', rarity: 'rare', hp: 160, colors: ['#0EA5E9', '#06B6D4'], type: 'PLUME' },
  { name: 'BOOBA', subtitle: 'Le Duc', rarity: 'legendary', hp: 220, colors: ['#1F1F1F', '#374151'], type: 'PIRATE' },
  { name: 'PNL', subtitle: 'Les Aliens', rarity: 'mythic', hp: 250, colors: ['#10B981', '#34D399'], type: 'QLF' },
];
