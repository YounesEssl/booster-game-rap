import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { state } from './state.js';
import { animator } from '../utils/animator.js';
import { updateUI } from './ui.js';
import {
  spawnParticles,
  spawnEnergyBurst,
  spawnLightning,
  spawnSpiralParticles,
  spawnShockwave,
  createGlowingOrb,
  removeGlowingOrb,
} from './particles.js';
import {
  triggerCameraShake,
  triggerCameraZoom,
  resetCameraZoom,
  triggerScreenFlash,
  pulseBloom,
  pulseChromaticAberration,
  pulseVignette,
} from './postprocessing.js';
import { createTearDebris, updateDebris } from '../objects/booster.js';
import { scene } from './scene.js';

// Store composer reference
let composerRef = null;
let activeDebris = [];

export function setComposerRef(composer) {
  composerRef = composer;
}

// Update debris in main loop
export function updateAnimationDebris(dt) {
  updateDebris(activeDebris, dt);
}

// ============================================
// EPIC BOOSTER OPENING ANIMATION
// ============================================
export async function openBooster() {
  if (state.phase !== 'idle') return;
  state.phase = 'opening';
  updateUI();

  const booster = state.booster;
  const { easing } = CONFIG;
  const center = new THREE.Vector3(0, 0, 0);

  // Get booster parts
  const { topHalf, bottomHalf, tearLine, tearLineY, height } = booster.userData;

  // ==========================================
  // PHASE 1: ANTICIPATION (0.8s)
  // ==========================================

  // Zoom in on the booster
  triggerCameraZoom(6.5, 3);

  // Subtle tilt back
  animator.animate(booster.rotation, { x: 0.1 }, 0.5, easing.smooth);

  // Create energy buildup at tear line
  const tearPos = new THREE.Vector3(0, tearLineY, 0.2);
  createGlowingOrb(tearPos, 0xff66aa);

  // Spiral particles converging to tear line
  spawnSpiralParticles(tearPos, 40, 0x66ddff);

  // Vibration buildup
  let vibration = 0;
  const vibrationInterval = setInterval(() => {
    vibration = Math.min(vibration + 0.003, 0.08);
    booster.position.x = (Math.random() - 0.5) * vibration;
    booster.rotation.z = (Math.random() - 0.5) * vibration * 0.3;
  }, 16);

  await animator.delay(600);

  // Show tear line glowing
  tearLine.visible = true;
  tearLine.material.opacity = 0;
  animator.animate(tearLine.material, { opacity: 1 }, 0.3, easing.smooth);

  // Pulse effects
  if (composerRef) {
    pulseBloom(composerRef, 1.2, 0.4);
    pulseVignette(composerRef, 0.6, 0.4);
  }

  await animator.delay(400);

  // ==========================================
  // PHASE 2: TENSION - MAXIMUM CHARGE (0.5s)
  // ==========================================

  // Intense vibration
  vibration = 0.12;

  // Lightning to tear line
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        tearLineY + (Math.random() - 0.5) * 2,
        1.5
      );
      spawnLightning(start, tearPos, i % 2 === 0 ? 0x66ddff : 0xff66aa, 2);
      triggerCameraShake(0.04, 0.1);
    }, i * 100);
  }

  // Booster stretches slightly
  animator.animate(booster.scale, { y: 1.03 }, 0.3, easing.smooth);

  await animator.delay(400);

  // ==========================================
  // PHASE 3: THE RIP! (0.6s)
  // ==========================================

  // Stop vibration
  clearInterval(vibrationInterval);
  booster.position.x = 0;
  booster.rotation.z = 0;

  // Remove orb
  removeGlowingOrb();

  // BIG FLASH at tear line!
  triggerScreenFlash(0xff66aa, 0.9, 4);
  triggerCameraShake(0.4, 0.6);

  if (composerRef) {
    pulseChromaticAberration(composerRef, 0.025, 0.5);
    pulseBloom(composerRef, 3, 0.6);
  }

  // Shockwave from tear
  spawnShockwave(tearPos, 0xffffff);

  // Spawn debris at tear line!
  activeDebris = createTearDebris(tearPos, 20);

  // Particles explosion at tear
  spawnParticles(tearPos, 60, 'explosion');

  // Hide tear line
  tearLine.visible = false;

  // Reset booster scale
  animator.animate(booster.scale, { x: 1, y: 1, z: 1 }, 0.2, easing.outBack);

  // ==========================================
  // PHASE 4: TOP TEARS OFF! (0.8s)
  // ==========================================

  // Top half flies up and away with rotation
  animator.animate(
    topHalf.position,
    { y: 5, x: 2.5, z: 3 },
    0.8,
    easing.outBack
  );
  animator.animate(
    topHalf.rotation,
    { z: -1.5, x: 1.2, y: 0.5 },
    0.8,
    easing.smooth
  );

  // Fade top half materials
  topHalf.traverse((child) => {
    if (child.isMesh && child.material?.uniforms?.opacity) {
      setTimeout(() => {
        const startOpacity = { value: 1 };
        const animate = () => {
          startOpacity.value -= 0.03;
          if (startOpacity.value > 0) {
            child.material.uniforms.opacity.value = startOpacity.value;
            requestAnimationFrame(animate);
          } else {
            child.visible = false;
          }
        };
        animate();
      }, 400);
    }
  });

  // More particles as it tears
  setTimeout(() => {
    spawnParticles(new THREE.Vector3(1, tearLineY + 0.5, 1), 25, 'tear');
  }, 100);

  await animator.delay(300);

  // Small shake as it separates
  triggerCameraShake(0.15, 0.25);

  // ==========================================
  // PHASE 5: CARDS SLIDE OUT FROM OPENING
  // ==========================================

  // Create a group to hold all cards - this allows rotating the whole pile
  const cardPile = new THREE.Group();
  cardPile.position.set(0, 0, 1.5);
  cardPile.rotation.set(0, Math.PI, 0); // Face camera (cards face down toward us)
  scene.add(cardPile);
  state.cardPile = cardPile;

  // Position cards at the tear opening BEFORE they become visible
  const cardCount = state.cards.length;
  state.cards.forEach((card, i) => {
    card.position.set(0, tearLineY - 0.2, 0.1);
    card.rotation.set(0, Math.PI, 0); // Face down
    card.scale.set(0.85, 0.85, 0.85);
  });

  // Cards slide out one by one from the tear opening
  // They stack on top of each other - card 0 at back, card 4 at front (closest to camera)
  for (let i = 0; i < cardCount; i++) {
    const card = state.cards[i];
    const delay = i * 180;

    setTimeout(() => {
      // Make card visible as it emerges
      card.visible = true;

      // Remove from scene and add to pile group
      scene.remove(card);
      cardPile.add(card);

      // Small sparkle as card emerges
      spawnParticles(new THREE.Vector3(0, 0, 2.5), 5, 'sparkle');

      // Position relative to pile group - stack in Z with small gaps
      const localX = 0;
      const localY = 0;
      const localZ = i * 0.03; // Small spacing between cards

      card.position.set(localX, localY, localZ);
      card.rotation.set(0, 0, 0); // Face down (pile will handle rotation)
      card.scale.set(0.7, 0.7, 0.7);

    }, delay);
  }

  // Wait a bit then start fading the bottom half
  await animator.delay(300);

  // ==========================================
  // PHASE 6: BOTTOM FALLS AWAY (while cards finish)
  // ==========================================

  // Bottom half tilts and falls
  animator.animate(
    bottomHalf.position,
    { y: -6, x: -1, z: -3 },
    0.8,
    easing.inOut
  );
  animator.animate(
    bottomHalf.rotation,
    { x: -0.6, z: 0.3 },
    0.8,
    easing.smooth
  );

  // Fade bottom half
  bottomHalf.traverse((child) => {
    if (child.isMesh && child.material?.uniforms?.opacity) {
      setTimeout(() => {
        const startOpacity = { value: 1 };
        const animate = () => {
          startOpacity.value -= 0.03;
          if (startOpacity.value > 0) {
            child.material.uniforms.opacity.value = startOpacity.value;
            requestAnimationFrame(animate);
          } else {
            child.visible = false;
          }
        };
        animate();
      }, 200);
    }
  });

  // Wait for all cards to finish sliding
  await animator.delay(cardCount * 180 + 300);

  // Hide entire booster
  booster.visible = false;

  // Reset camera
  resetCameraZoom(2);

  state.phase = 'revealing';
  updateUI();
}

// ============================================
// CARD REVEAL SYSTEM - Stack based
// ============================================
let isAnimating = false;

// Store the base position where the card stack sits
const stackPosition = { x: 0, y: 0, z: 1 };

// Get the top card of the remaining stack
function getTopCard() {
  // Cards are indexed 0-4, we reveal from index 4 down to 0
  const topIndex = 4 - state.revealIndex;
  if (topIndex < 0) return null;
  return state.cards[topIndex];
}

// Flip the top card to reveal it
export function revealCard() {
  if (state.phase !== 'revealing') return;
  if (isAnimating) return;

  const { easing } = CONFIG;

  // If there's already a focused card, dismiss it first
  if (state.focusedCard) {
    dismissCurrentCard();
    return;
  }

  // Get the top card to reveal
  const card = getTopCard();
  if (!card) {
    // All cards revealed
    finishReveal();
    return;
  }

  isAnimating = true;

  // Remove card from pile group and add back to scene
  // Get world position before removing from group
  if (state.cardPile) {
    const worldPos = new THREE.Vector3();
    card.getWorldPosition(worldPos);

    state.cardPile.remove(card);
    scene.add(card);

    // Set position and reset rotation for clean animation
    card.position.copy(worldPos);
    card.rotation.set(0, Math.PI, 0); // Start face-down
  } else {
    scene.add(card);
    card.rotation.set(0, Math.PI, 0);
  }

  // Flip the card 180° on Y axis to show front
  animator.animate(
    card.rotation,
    { x: 0, y: 0, z: 0 },
    0.5,
    easing.outBack
  );

  // Position in front of camera
  animator.animate(
    card.position,
    { x: 0, y: 0, z: 2.5 },
    0.5,
    easing.outBack
  );

  // Scale
  animator.animate(
    card.scale,
    { x: 0.7, y: 0.7, z: 0.7 },
    0.4,
    easing.outBack
  );

  // Set as focused card for manipulation
  state.focusedCard = card;
  card.userData.revealed = true;

  // Reset rotation state for manipulation
  state.rotation = { x: 0, y: 0 };

  // Rarity effects after flip
  setTimeout(() => {
    const rarity = card.userData.rarity || 'common';
    playRarityEffects(rarity, card.position);
    isAnimating = false;
  }, 350);
}

// Dismiss current card to the side and increment reveal index
export function dismissCurrentCard() {
  if (!state.focusedCard || isAnimating) return;

  const { easing } = CONFIG;
  const oldCard = state.focusedCard;

  isAnimating = true;
  state.focusedCard = null;
  state.revealIndex++;

  // Slide card to the right and fade
  animator.animate(
    oldCard.position,
    { x: 4, y: oldCard.position.y + 0.5, z: oldCard.position.z - 1 },
    0.35,
    easing.inBack
  );

  animator.animate(
    oldCard.rotation,
    { y: -0.5, z: -0.2 },
    0.35,
    easing.smooth
  );

  animator.animate(
    oldCard.scale,
    { x: 0.8, y: 0.8, z: 0.8 },
    0.3,
    easing.smooth
  );

  // Sparkle trail
  setTimeout(() => {
    spawnParticles(oldCard.position.clone(), 8, 'sparkle');
  }, 150);

  // Hide after animation
  setTimeout(() => {
    oldCard.visible = false;
  }, 350);

  // Wait for animation to finish
  setTimeout(() => {
    isAnimating = false;

    // Check if all cards are done
    const nextCard = getTopCard();
    if (!nextCard) {
      finishReveal();
    }
  }, 400);
}

// Play effects based on card rarity
function playRarityEffects(rarity, position) {
  if (rarity === 'legendary' || rarity === 'mythic') {
    triggerScreenFlash(0xffd700, 0.5, 3);
    triggerCameraShake(0.2, 0.4);
    spawnParticles(position.clone(), 40, 'explosion');
    spawnShockwave(position.clone(), 0xffd700);
    spawnLightning(new THREE.Vector3(-2, 2, 2), position.clone(), 0xffd700, 2);
    spawnLightning(new THREE.Vector3(2, 2, 2), position.clone(), 0xffd700, 2);
    if (composerRef) {
      pulseBloom(composerRef, 2.5, 0.6);
      pulseChromaticAberration(composerRef, 0.015, 0.5);
    }
  } else if (rarity === 'epic') {
    triggerScreenFlash(0xaa66ff, 0.3, 3);
    triggerCameraShake(0.12, 0.25);
    spawnParticles(position.clone(), 25, 'sparkle');
    spawnEnergyBurst(position.clone(), 0xaa66ff, 2);
    if (composerRef) pulseBloom(composerRef, 1.8, 0.4);
  } else if (rarity === 'rare') {
    triggerCameraShake(0.06, 0.15);
    spawnParticles(position.clone(), 15, 'sparkle');
    if (composerRef) pulseBloom(composerRef, 1.3, 0.3);
  } else {
    spawnParticles(position.clone(), 8, 'sparkle');
  }
}

// Finish the reveal sequence
function finishReveal() {
  setTimeout(() => {
    spawnParticles(new THREE.Vector3(0, 0, 3), 50, 'explosion');
    spawnShockwave(new THREE.Vector3(0, 0, 3), 0xffaa44);
    triggerScreenFlash(0xffaa44, 0.3, 3);
    triggerCameraShake(0.15, 0.3);
    state.phase = 'done';
    updateUI();
  }, 300);
}
