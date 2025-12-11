import { CONFIG } from '../config.js';

// ============================================
// ANIMATOR CLASS
// ============================================
export class Animator {
  constructor() {
    this.tweens = [];
  }

  animate(target, props, duration, easing = CONFIG.easing.smooth, onComplete = null) {
    const tween = {
      target,
      startValues: {},
      endValues: props,
      duration,
      elapsed: 0,
      easing,
      onComplete,
    };

    for (const key in props) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        tween.startValues[key] = { ...target[key] };
      } else {
        tween.startValues[key] = target[key];
      }
    }

    this.tweens.push(tween);
    return tween;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  update(dt) {
    const completed = [];

    this.tweens = this.tweens.filter(tween => {
      tween.elapsed += dt;
      const progress = Math.min(tween.elapsed / tween.duration, 1);
      const eased = tween.easing(progress);

      for (const key in tween.endValues) {
        const start = tween.startValues[key];
        const end = tween.endValues[key];

        if (typeof end === 'object' && end !== null) {
          for (const subKey in end) {
            tween.target[key][subKey] = start[subKey] + (end[subKey] - start[subKey]) * eased;
          }
        } else {
          tween.target[key] = start + (end - start) * eased;
        }
      }

      if (progress >= 1) {
        if (tween.onComplete) completed.push(tween.onComplete);
        return false;
      }
      return true;
    });

    completed.forEach(cb => cb());
  }

  clear() {
    this.tweens = [];
  }
}

// Singleton instance
export const animator = new Animator();
