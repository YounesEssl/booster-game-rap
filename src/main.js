import { CONFIG, CARDS_DATA } from './config.js';
import { scene, renderer, setupLights, mountRenderer, handleResize } from './core/scene.js';
import { setupEnvironment, updateBackground } from './core/environment.js';
import { createComposer, updateCameraEffects } from './core/postprocessing.js';
import { state, resetState } from './core/state.js';
import { animator } from './utils/animator.js';
import { createBooster, setEnvMap as setBoosterEnvMap, updateBoosterTime } from './objects/booster.js';
import { createCard, setEnvMap as setCardEnvMap } from './objects/card.js';
import { setupInputListeners } from './core/input.js';
import { updateUI, showLoading } from './core/ui.js';
import { updateParticles } from './core/particles.js';
import { updateHoloTime } from './utils/holoShader.js';
import { setComposerRef, updateAnimationDebris } from './core/animations.js';
import { preloadCardImages } from './utils/textures.js';

// ============================================

// ============================================
// INITIALIZATION
// ============================================
let composer = null;

async function init() {
  // Cleanup previous state
  if (state.booster) scene.remove(state.booster);
  state.cards.forEach(c => scene.remove(c));
  animator.clear();
  resetState();
  // Start loop
  loop(0);

  // Initial Resize to set correct Camera Z for Mobile/Desktop
  handleResize(composer);

  // Fade out loading
  setTimeout(() => showLoading(false), 500);

  state.phase = 'loading';
  showLoading();

  // Preload card images
  await preloadCardImages(CARDS_DATA);

  // Create booster
  state.booster = await createBooster();
  scene.add(state.booster);

  // Create cards
  for (let i = 0; i < 5; i++) {
    const card = createCard(i);
    card.visible = false;
    state.cards.push(card);
    scene.add(card);
  }

  state.phase = 'idle';
  updateUI();
}

// ============================================
// RENDER LOOP
// ============================================
let lastTime = 0;

function loop(time) {
  requestAnimationFrame(loop);

  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  state.idleTime += dt;

  animator.update(dt);
  // Update shader time for holographic effects
  updateHoloTime(scene, time / 1000);

  // Update particles
  updateParticles(dt);

  // Update animation debris (torn booster pieces)
  updateAnimationDebris(dt);

  // Update immersive background with time and mouse position for parallax
  const mouseX = state.rotation.y * 0.5; // Use rotation as proxy for mouse
  const mouseY = state.rotation.x * 0.5;
  updateBackground(time / 1000, mouseX, mouseY);

  // Update booster holographic shader
  if (state.booster) {
    updateBoosterTime(state.booster, time / 1000);
  }

  // Update camera effects (shake, zoom, flash)
  updateCameraEffects(dt);

  // Booster rotation with inertia
  if (state.booster && state.booster.visible && state.phase === 'idle') {
    const { drag } = CONFIG;

    if (!state.isDragging) {
      state.rotation.x += state.rotationVelocity.x;
      state.rotation.y += state.rotationVelocity.y;

      state.rotationVelocity.x *= drag.inertia;
      state.rotationVelocity.y *= drag.inertia;

      if (drag.returnSpeed > 0) {
        state.rotation.x *= (1 - drag.returnSpeed);
        state.rotation.y *= (1 - drag.returnSpeed);
      }
    }

    // Smoothly interpolate current rotation to target rotation (state.rotation)
    // Lerp factor 0.3 for snappy 1:1 feel without lag
    state.booster.rotation.x += (state.rotation.x - state.booster.rotation.x) * 0.3;
    state.booster.rotation.y += (state.rotation.y - state.booster.rotation.y) * 0.3;

    // Auto-breathing
    // const breathe = 1 + Math.sin(state.idleTime * 2) * 0.005;
    // state.booster.scale.set(breathe, breathe, breathe);
  }

  // Focused Card rotation (Same logic)
  if (state.focusedCard) {

    // Apply Inertia & Return to Zero for Card Interaction too
    if (!state.isDragging) {
      const { drag } = CONFIG;
      state.rotation.x += state.rotationVelocity.x;
      state.rotation.y += state.rotationVelocity.y;

      state.rotationVelocity.x *= drag.inertia;
      state.rotationVelocity.y *= drag.inertia;

      // Return to center (0,0,0)
      const returnSpeed = 0.1;
      state.rotation.x *= (1 - returnSpeed);
      state.rotation.y *= (1 - returnSpeed);
    }

    state.focusedCard.rotation.x += (state.rotation.x - state.focusedCard.rotation.x) * 0.15;
    state.focusedCard.rotation.y += (state.rotation.y - state.focusedCard.rotation.y) * 0.15;
  }

  // Card pile manipulation (when no card is focused but in revealing phase)
  if (state.phase === 'revealing' && !state.focusedCard && state.cardPile) {
    if (!state.isDragging) {
      // Apply inertia
      state.rotation.x += state.rotationVelocity.x;
      state.rotation.y += state.rotationVelocity.y;

      state.rotationVelocity.x *= 0.92;
      state.rotationVelocity.y *= 0.92;

      // Return to center smoothly
      const returnSpeed = 0.08;
      state.rotation.x *= (1 - returnSpeed);
      state.rotation.y *= (1 - returnSpeed);

      // Apply to the pile group
      state.cardPile.rotation.y += (Math.PI + state.rotation.y - state.cardPile.rotation.y) * 0.1;
      state.cardPile.rotation.x += (state.rotation.x - state.cardPile.rotation.x) * 0.1;
    }
  }

  // Cards floating & Holo Update
  state.cards.forEach((card, i) => {
    if (card.userData.revealed && card.visible) {
      card.position.y += Math.sin(state.idleTime * 1.2 + i * 0.8) * 0.0002;
    }
    // Update Holo Shader Time if applicable
    // Check local materials or traverse
    if (card.visible) {
      // Simple traversal or direct access if we know structure
      // card is a Group now
      card.traverse(c => {
        if (c.isMesh && c.material) {
          if (c.material.userData && c.material.userData.shader) {
            c.material.userData.shader.uniforms.time.value = time / 1000;
          }
        }
      });
    }
  });

  // DEBUG: Bypass composer to check scene
  // renderer.render(scene, camera);
  composer.render();
}

// ============================================
// BOOTSTRAP
// ============================================
function bootstrap() {
  // Mount renderer
  mountRenderer();

  // Setup lights
  setupLights();

  // Setup environment and get envMap
  const envMap = setupEnvironment();

  // Pass envMap to object factories
  setBoosterEnvMap(envMap);
  setCardEnvMap(envMap);
  // Create post-processing composer
  composer = createComposer();

  // Pass composer reference to animations for effects
  setComposerRef(composer);

  // Setup input listeners
  setupInputListeners(composer, init);

  // Window Resize
  window.addEventListener('resize', () => handleResize(composer));

  // Start Main Loop & Init Logic
  init();
  loop(0);

  // Initial Resize
  handleResize(composer);
}

bootstrap();
