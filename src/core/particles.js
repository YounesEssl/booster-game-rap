import * as THREE from 'three';
import { scene } from './scene.js';

// ============================================
// EPIC PARTICLE SYSTEM - Cyberpunk Edition
// ============================================

const particles = [];
const trailParticles = [];
const energyRings = [];
const lightningBolts = [];

// Particle geometries
const smallGeo = new THREE.PlaneGeometry(0.03, 0.03);
const mediumGeo = new THREE.PlaneGeometry(0.06, 0.06);
const largeGeo = new THREE.PlaneGeometry(0.12, 0.12);

// Neon colors palette
const NEON_COLORS = {
  pink: 0xff66aa,
  cyan: 0x66ddff,
  orange: 0xffaa44,
  purple: 0xaa66ff,
  green: 0x66ffaa,
  white: 0xffffff,
  gold: 0xffd700,
};

// ============================================
// BASIC PARTICLES
// ============================================
export function spawnParticles(position, count = 20, type = 'tear') {
  const configs = {
    tear: { colors: [NEON_COLORS.gold, NEON_COLORS.orange, NEON_COLORS.white], speed: 4, gravity: 9.8, size: 'medium' },
    sparkle: { colors: [NEON_COLORS.cyan, NEON_COLORS.pink, NEON_COLORS.white], speed: 2, gravity: 2, size: 'small' },
    explosion: { colors: [NEON_COLORS.pink, NEON_COLORS.cyan, NEON_COLORS.orange, NEON_COLORS.purple], speed: 8, gravity: 3, size: 'large' },
    energy: { colors: [NEON_COLORS.cyan, NEON_COLORS.pink], speed: 1, gravity: 0, size: 'small' },
  };

  const config = configs[type] || configs.tear;
  const geo = config.size === 'small' ? smallGeo : config.size === 'large' ? largeGeo : mediumGeo;

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(position);
    mesh.position.x += (Math.random() - 0.5) * 0.5;
    mesh.position.y += (Math.random() - 0.5) * 0.3;
    mesh.position.z += (Math.random() - 0.5) * 0.3;

    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.3) * Math.PI;
    const speed = config.speed * (0.5 + Math.random() * 0.5);

    mesh.userData = {
      velocity: new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2,
        Math.sin(angle) * Math.cos(elevation) * speed
      ),
      rotationSpeed: new THREE.Vector3(
        Math.random() * 15,
        Math.random() * 15,
        Math.random() * 15
      ),
      life: 1.0 + Math.random() * 0.8,
      maxLife: 1.0 + Math.random() * 0.8,
      gravity: config.gravity,
      type: type,
    };

    scene.add(mesh);
    particles.push(mesh);
  }
}

// ============================================
// ENERGY BURST - Expanding rings
// ============================================
export function spawnEnergyBurst(position, color = NEON_COLORS.cyan, count = 3) {
  for (let i = 0; i < count; i++) {
    const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.lookAt(new THREE.Vector3(0, 0, 10)); // Face camera

    ring.userData = {
      life: 1.0,
      maxLife: 1.0,
      expandSpeed: 3 + i * 1.5,
      delay: i * 0.1,
      started: false,
    };

    scene.add(ring);
    energyRings.push(ring);
  }
}

// ============================================
// LIGHTNING EFFECT
// ============================================
export function spawnLightning(start, end, color = NEON_COLORS.cyan, branches = 3) {
  const points = [];
  const segments = 8;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    if (i > 0 && i < segments) {
      point.x += (Math.random() - 0.5) * 0.3;
      point.y += (Math.random() - 0.5) * 0.3;
      point.z += (Math.random() - 0.5) * 0.2;
    }

    points.push(point);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    linewidth: 2,
  });

  const lightning = new THREE.Line(geometry, material);
  lightning.userData = {
    life: 0.3 + Math.random() * 0.2,
    maxLife: 0.3 + Math.random() * 0.2,
  };

  scene.add(lightning);
  lightningBolts.push(lightning);

  // Spawn branches
  if (branches > 0) {
    const branchStart = points[Math.floor(Math.random() * (segments - 2)) + 1];
    const branchEnd = branchStart.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 0.5
      )
    );
    spawnLightning(branchStart, branchEnd, color, branches - 1);
  }
}

// ============================================
// SPIRAL PARTICLES - For buildup effect
// ============================================
export function spawnSpiralParticles(center, count = 50, color = NEON_COLORS.cyan) {
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? color : NEON_COLORS.pink,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(smallGeo, material);

    const angle = (i / count) * Math.PI * 4;
    const radius = 2 + Math.random() * 2;
    const height = (Math.random() - 0.5) * 3;

    mesh.position.set(
      center.x + Math.cos(angle) * radius,
      center.y + height,
      center.z + Math.sin(angle) * radius
    );

    mesh.userData = {
      center: center.clone(),
      angle: angle,
      radius: radius,
      height: height,
      spiralSpeed: 3 + Math.random() * 2,
      inwardSpeed: 1.5 + Math.random(),
      life: 1.5,
      maxLife: 1.5,
      type: 'spiral',
    };

    scene.add(mesh);
    particles.push(mesh);
  }
}

// ============================================
// EXPLOSION SHOCKWAVE
// ============================================
export function spawnShockwave(position, color = NEON_COLORS.white) {
  const shockGeo = new THREE.RingGeometry(0.1, 0.3, 64);
  const shockMat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });

  const shockwave = new THREE.Mesh(shockGeo, shockMat);
  shockwave.position.copy(position);
  shockwave.lookAt(new THREE.Vector3(0, 0, 10));

  shockwave.userData = {
    life: 0.6,
    maxLife: 0.6,
    expandSpeed: 12,
    type: 'shockwave',
  };

  scene.add(shockwave);
  energyRings.push(shockwave);
}

// ============================================
// TRAIL PARTICLES (follow a path)
// ============================================
export function spawnTrailParticle(position, color = NEON_COLORS.cyan) {
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(smallGeo, material);
  mesh.position.copy(position);

  mesh.userData = {
    life: 0.5,
    maxLife: 0.5,
    type: 'trail',
  };

  scene.add(mesh);
  trailParticles.push(mesh);
}

// ============================================
// GLOWING ORB (for energy buildup)
// ============================================
let glowingOrb = null;

export function createGlowingOrb(position, color = NEON_COLORS.cyan) {
  if (glowingOrb) {
    scene.remove(glowingOrb);
  }

  const orbGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const orbMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });

  glowingOrb = new THREE.Mesh(orbGeo, orbMat);
  glowingOrb.position.copy(position);
  glowingOrb.userData = {
    baseScale: 0.1,
    targetScale: 1,
    pulseSpeed: 5,
    time: 0,
  };

  scene.add(glowingOrb);
  return glowingOrb;
}

export function updateGlowingOrb(dt, intensity = 1) {
  if (!glowingOrb) return;

  glowingOrb.userData.time += dt;
  const pulse = Math.sin(glowingOrb.userData.time * glowingOrb.userData.pulseSpeed) * 0.2 + 1;
  const scale = glowingOrb.userData.baseScale + (glowingOrb.userData.targetScale - glowingOrb.userData.baseScale) * intensity;

  glowingOrb.scale.setScalar(scale * pulse);
  glowingOrb.material.opacity = 0.5 + intensity * 0.5;
}

export function removeGlowingOrb() {
  if (glowingOrb) {
    scene.remove(glowingOrb);
    glowingOrb = null;
  }
}

// ============================================
// UPDATE ALL PARTICLES
// ============================================
export function updateParticles(dt) {
  // Update basic particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const data = p.userData;

    data.life -= dt;

    if (data.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
      continue;
    }

    const lifeRatio = data.life / data.maxLife;

    if (data.type === 'spiral') {
      // Spiral inward
      data.angle += data.spiralSpeed * dt;
      data.radius -= data.inwardSpeed * dt;
      data.radius = Math.max(0.1, data.radius);

      p.position.x = data.center.x + Math.cos(data.angle) * data.radius;
      p.position.z = data.center.z + Math.sin(data.angle) * data.radius;
      p.position.y += (data.center.y - p.position.y) * dt * 2;

      p.material.opacity = lifeRatio * 0.8;
    } else {
      // Regular physics
      data.velocity.y -= data.gravity * dt;
      p.position.addScaledVector(data.velocity, dt);

      p.rotation.x += data.rotationSpeed.x * dt;
      p.rotation.y += data.rotationSpeed.y * dt;
      p.rotation.z += data.rotationSpeed.z * dt;

      // Fade based on life
      if (data.type === 'explosion') {
        p.material.opacity = lifeRatio;
        const scale = 1 + (1 - lifeRatio) * 0.5;
        p.scale.setScalar(scale);
      } else {
        p.material.opacity = Math.min(1, lifeRatio * 2);
      }
    }
  }

  // Update trail particles
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.userData.life -= dt;

    if (p.userData.life <= 0) {
      scene.remove(p);
      trailParticles.splice(i, 1);
      continue;
    }

    const lifeRatio = p.userData.life / p.userData.maxLife;
    p.material.opacity = lifeRatio * 0.6;
    p.scale.setScalar(lifeRatio);
  }

  // Update energy rings
  for (let i = energyRings.length - 1; i >= 0; i--) {
    const ring = energyRings[i];
    const data = ring.userData;

    if (data.delay && data.delay > 0) {
      data.delay -= dt;
      continue;
    }

    data.life -= dt;

    if (data.life <= 0) {
      scene.remove(ring);
      energyRings.splice(i, 1);
      continue;
    }

    const lifeRatio = data.life / data.maxLife;

    // Expand
    const scale = 1 + (1 - lifeRatio) * data.expandSpeed;
    ring.scale.setScalar(scale);

    // Fade
    ring.material.opacity = lifeRatio * 0.8;
  }

  // Update lightning
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    bolt.userData.life -= dt;

    if (bolt.userData.life <= 0) {
      scene.remove(bolt);
      lightningBolts.splice(i, 1);
      continue;
    }

    const lifeRatio = bolt.userData.life / bolt.userData.maxLife;
    bolt.material.opacity = lifeRatio;
  }
}

// ============================================
// CLEAR ALL PARTICLES
// ============================================
export function clearAllParticles() {
  [...particles, ...trailParticles, ...energyRings, ...lightningBolts].forEach(p => {
    scene.remove(p);
  });

  particles.length = 0;
  trailParticles.length = 0;
  energyRings.length = 0;
  lightningBolts.length = 0;

  removeGlowingOrb();
}
