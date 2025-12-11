import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  EffectPass,
  VignetteEffect,
  SMAAEffect,
  ChromaticAberrationEffect,
  SMAAPreset,
  EdgeDetectionMode
} from 'postprocessing';
import { CONFIG } from '../config.js';
import { scene, camera, renderer } from './scene.js';

// ============================================
// CAMERA EFFECTS STATE
// ============================================
let cameraShake = {
  intensity: 0,
  decay: 0.95,
  frequency: 30,
  time: 0,
  originalPosition: new THREE.Vector3(),
};

let cameraZoom = {
  active: false,
  targetZ: 8.5,
  originalZ: 8.5,
  speed: 5,
};

let screenFlash = {
  active: false,
  intensity: 0,
  color: new THREE.Color(1, 1, 1),
  decay: 3,
};

let flashOverlay = null;

// ============================================
// POST-PROCESSING SETUP
// ============================================
export function createComposer() {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType
  });

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 1. Bloom - for epic glow effects
  const bloomEffect = new BloomEffect({
    intensity: CONFIG.bloom.intensity,
    luminanceThreshold: CONFIG.bloom.luminanceThreshold,
    luminanceSmoothing: CONFIG.bloom.luminanceSmoothing,
    mipmapBlur: true,
  });

  // Chromatic Aberration (for impact effects)
  const chromaticAberrationEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.001, 0.0005)
  });

  // Vignette (will be animated during opening)
  const vignetteEffect = new VignetteEffect({
    darkness: 0.4,
    offset: 0.3,
  });

  // Anti-aliasing SMAA
  const smaaEffect = new SMAAEffect({
    preset: SMAAPreset.HIGH,
    edgeDetectionMode: EdgeDetectionMode.COLOR
  });

  // Pass 1: Bloom for glow
  const bloomPass = new EffectPass(camera, bloomEffect);
  composer.addPass(bloomPass);

  // Pass 2: Vignette
  const vignettePass = new EffectPass(camera, vignetteEffect);
  composer.addPass(vignettePass);

  // Pass 3: Chromatic Aberration
  const chromaticPass = new EffectPass(camera, chromaticAberrationEffect);
  composer.addPass(chromaticPass);

  // Pass 4: SMAA
  const smaaPass = new EffectPass(camera, smaaEffect);
  composer.addPass(smaaPass);

  // Store effects for dynamic control
  composer.userData = {
    bloom: bloomEffect,
    chromaticAberration: chromaticAberrationEffect,
    vignette: vignetteEffect,
    // Default values
    defaultBloomIntensity: CONFIG.bloom.intensity,
    defaultChromaticOffset: new THREE.Vector2(0.001, 0.0005),
    defaultVignetteDarkness: 0.4,
  };

  // Store original camera position
  cameraShake.originalPosition.copy(camera.position);
  cameraZoom.originalZ = camera.position.z;
  cameraZoom.targetZ = camera.position.z;

  // Create flash overlay
  createFlashOverlay();

  return composer;
}

// ============================================
// FLASH OVERLAY
// ============================================
function createFlashOverlay() {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });

  flashOverlay = new THREE.Mesh(geometry, material);
  flashOverlay.position.z = camera.position.z - 1;
  flashOverlay.renderOrder = 9999;
  scene.add(flashOverlay);
}

// ============================================
// CAMERA SHAKE
// ============================================
export function triggerCameraShake(intensity = 0.5, duration = 0.5) {
  cameraShake.intensity = intensity;
  cameraShake.decay = Math.pow(0.01, 1 / (duration * 60)); // Decay to ~1% over duration
  cameraShake.time = 0;
}

// ============================================
// CAMERA ZOOM
// ============================================
export function triggerCameraZoom(targetZ, speed = 5) {
  cameraZoom.active = true;
  cameraZoom.targetZ = targetZ;
  cameraZoom.speed = speed;
}

export function resetCameraZoom(speed = 3) {
  cameraZoom.active = true;
  cameraZoom.targetZ = cameraZoom.originalZ;
  cameraZoom.speed = speed;
}

// ============================================
// SCREEN FLASH
// ============================================
export function triggerScreenFlash(color = 0xffffff, intensity = 1, decay = 5) {
  screenFlash.active = true;
  screenFlash.intensity = intensity;
  screenFlash.color.setHex(color);
  screenFlash.decay = decay;

  if (flashOverlay) {
    flashOverlay.material.color.copy(screenFlash.color);
    flashOverlay.material.opacity = intensity;
  }
}

// ============================================
// BLOOM PULSE
// ============================================
export function pulseBloom(composer, intensity = 2, duration = 0.3) {
  if (!composer?.userData?.bloom) return;

  const bloom = composer.userData.bloom;
  const original = composer.userData.defaultBloomIntensity;

  bloom.intensity = intensity;

  // Animate back
  const startTime = performance.now();
  const animate = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);
    bloom.intensity = intensity + (original - intensity) * easeOutQuart(t);

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
}

// ============================================
// CHROMATIC ABERRATION PULSE
// ============================================
export function pulseChromaticAberration(composer, intensity = 0.02, duration = 0.4) {
  if (!composer?.userData?.chromaticAberration) return;

  const ca = composer.userData.chromaticAberration;
  const original = composer.userData.defaultChromaticOffset.clone();

  ca.offset.set(intensity, intensity * 0.5);

  const startTime = performance.now();
  const animate = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);
    const factor = 1 - easeOutQuart(t);

    ca.offset.set(
      original.x + (intensity - original.x) * factor,
      original.y + (intensity * 0.5 - original.y) * factor
    );

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
}

// ============================================
// VIGNETTE PULSE
// ============================================
export function pulseVignette(composer, darkness = 0.8, duration = 0.5) {
  if (!composer?.userData?.vignette) return;

  const vignette = composer.userData.vignette;
  const original = composer.userData.defaultVignetteDarkness;

  vignette.darkness = darkness;

  const startTime = performance.now();
  const animate = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);
    vignette.darkness = darkness + (original - darkness) * easeOutQuart(t);

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
}

// ============================================
// UPDATE CAMERA EFFECTS (call in render loop)
// ============================================
export function updateCameraEffects(dt) {
  // Camera shake
  if (cameraShake.intensity > 0.001) {
    cameraShake.time += dt;

    const shakeX = Math.sin(cameraShake.time * cameraShake.frequency) * cameraShake.intensity;
    const shakeY = Math.cos(cameraShake.time * cameraShake.frequency * 1.3) * cameraShake.intensity;

    camera.position.x = cameraShake.originalPosition.x + shakeX;
    camera.position.y = cameraShake.originalPosition.y + shakeY;

    cameraShake.intensity *= cameraShake.decay;
  } else {
    camera.position.x = cameraShake.originalPosition.x;
    camera.position.y = cameraShake.originalPosition.y;
  }

  // Camera zoom
  if (cameraZoom.active) {
    const diff = cameraZoom.targetZ - camera.position.z;
    if (Math.abs(diff) > 0.01) {
      camera.position.z += diff * cameraZoom.speed * dt;
    } else {
      camera.position.z = cameraZoom.targetZ;
      cameraZoom.active = false;
    }
  }

  // Screen flash decay
  if (screenFlash.active && flashOverlay) {
    screenFlash.intensity -= screenFlash.decay * dt;

    if (screenFlash.intensity <= 0) {
      screenFlash.intensity = 0;
      screenFlash.active = false;
    }

    flashOverlay.material.opacity = screenFlash.intensity;
    flashOverlay.position.z = camera.position.z - 1;
  }
}

// Easing function
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}