import * as THREE from 'three';
import { renderer, scene } from './scene.js';

// ============================================
// ENVIRONMENT MAP - Pour les reflets réalistes
// ============================================
export function createEnvMap() {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Créer un environnement de studio simple
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Gradient du haut vers le bas - tons cyberpunk
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1a1025');
  gradient.addColorStop(0.3, '#15102a');
  gradient.addColorStop(0.6, '#0d0a18');
  gradient.addColorStop(1, '#080610');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Highlights néon pour les reflets
  ctx.fillStyle = 'rgba(255, 100, 200, 0.02)';
  ctx.beginPath();
  ctx.arc(300, 150, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(100, 200, 255, 0.02)';
  ctx.beginPath();
  ctx.arc(700, 200, 80, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  pmremGenerator.dispose();

  return envMap;
}

// ============================================
// IMMERSIVE 3D BACKGROUND
// ============================================
let backgroundMesh = null;
let backgroundMaterial = null;
let floatingParticles = null;
let neonLights = [];

export function createImmersiveBackground() {
  const textureLoader = new THREE.TextureLoader();

  // Load the background image
  const bgTexture = textureLoader.load('/textures/background.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  // Create a curved plane for depth effect (like a cylindrical screen)
  const bgGeometry = new THREE.PlaneGeometry(40, 25, 32, 32);

  // Vertex shader for subtle parallax and depth
  const vertexShader = `
    varying vec2 vUv;
    varying float vDepth;
    uniform float time;

    void main() {
      vUv = uv;

      // Subtle wave animation for immersion
      vec3 pos = position;
      float wave = sin(pos.x * 0.3 + time * 0.2) * 0.1;
      wave += sin(pos.y * 0.2 + time * 0.15) * 0.08;
      pos.z += wave;

      // Curve the plane slightly for depth
      float curve = pow(abs(uv.x - 0.5) * 2.0, 2.0) * 2.0;
      pos.z -= curve;

      vDepth = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  // Fragment shader with atmospheric effects
  const fragmentShader = `
    uniform sampler2D bgTexture;
    uniform float time;
    uniform vec2 mousePos;

    varying vec2 vUv;
    varying float vDepth;

    void main() {
      // Parallax offset based on mouse
      vec2 parallaxOffset = mousePos * 0.02;
      vec2 uv = vUv + parallaxOffset;

      // Sample the texture
      vec4 texColor = texture2D(bgTexture, uv);

      // Add subtle color pulsing for neon atmosphere
      float pulse = sin(time * 0.5) * 0.03 + 0.97;

      // Vignette effect
      float vignette = 1.0 - smoothstep(0.3, 0.9, length(vUv - 0.5) * 1.2);

      // Fog/depth fade
      float fogFactor = smoothstep(-3.0, 1.0, vDepth) * 0.3 + 0.7;

      // Combine effects
      vec3 finalColor = texColor.rgb * pulse * fogFactor;
      finalColor *= vignette;

      // Add subtle neon glow tint
      finalColor += vec3(0.02, 0.0, 0.03) * (1.0 - vignette);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  backgroundMaterial = new THREE.ShaderMaterial({
    uniforms: {
      bgTexture: { value: bgTexture },
      time: { value: 0 },
      mousePos: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  backgroundMesh = new THREE.Mesh(bgGeometry, backgroundMaterial);
  backgroundMesh.position.z = -15;
  backgroundMesh.position.y = 1;
  backgroundMesh.renderOrder = -1000;
  scene.add(backgroundMesh);

  // Create floating dust/light particles
  createFloatingParticles();

  // Create volumetric neon light beams
  createNeonLightBeams();

  return backgroundMesh;
}

// ============================================
// FLOATING PARTICLES - Dust/Light motes
// ============================================
function createFloatingParticles() {
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const colors = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Spread particles in the scene
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 2] = Math.random() * -10 - 2;

    sizes[i] = Math.random() * 3 + 1;
    speeds[i] = Math.random() * 0.5 + 0.2;

    // Neon colors - pink, cyan, warm yellow
    const colorChoice = Math.random();
    if (colorChoice < 0.33) {
      colors[i * 3] = 1.0;     // R
      colors[i * 3 + 1] = 0.4; // G
      colors[i * 3 + 2] = 0.7; // B - Pink
    } else if (colorChoice < 0.66) {
      colors[i * 3] = 0.3;     // R
      colors[i * 3 + 1] = 0.8; // G
      colors[i * 3 + 2] = 1.0; // B - Cyan
    } else {
      colors[i * 3] = 1.0;     // R
      colors[i * 3 + 1] = 0.8; // G
      colors[i * 3 + 2] = 0.4; // B - Warm
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.userData.speeds = speeds;
  geometry.userData.initialPositions = positions.slice();

  const vertexShader = `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      // Size attenuation
      gl_PointSize = size * (200.0 / -mvPosition.z);

      // Fade based on depth
      vAlpha = smoothstep(-15.0, -2.0, mvPosition.z) * 0.6;

      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Soft circular particle
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;

      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  floatingParticles = new THREE.Points(geometry, material);
  floatingParticles.renderOrder = -500;
  scene.add(floatingParticles);
}

// ============================================
// NEON LIGHT BEAMS - Volumetric effect
// ============================================
function createNeonLightBeams() {
  const beamConfigs = [
    { x: -6, y: 4, z: -8, color: 0xff66aa, intensity: 0.3, angle: 0.3 },
    { x: 5, y: 3, z: -10, color: 0x66ddff, intensity: 0.25, angle: -0.2 },
    { x: 0, y: -2, z: -6, color: 0xffaa44, intensity: 0.2, angle: 0.1 },
  ];

  beamConfigs.forEach((config) => {
    // Create a cone for volumetric light effect
    const geometry = new THREE.ConeGeometry(2, 8, 16, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(config.color) },
        intensity: { value: config.intensity },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vY;

        void main() {
          vUv = uv;
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float intensity;
        uniform float time;
        varying vec2 vUv;
        varying float vY;

        void main() {
          // Fade from tip to base
          float fade = smoothstep(-4.0, 4.0, vY);

          // Radial fade
          float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;

          // Flicker
          float flicker = sin(time * 3.0) * 0.1 + 0.9;

          float alpha = fade * radial * intensity * flicker;

          gl_FragColor = vec4(color, alpha * 0.15);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const beam = new THREE.Mesh(geometry, material);
    beam.position.set(config.x, config.y, config.z);
    beam.rotation.z = config.angle;
    beam.rotation.x = Math.PI;
    beam.renderOrder = -600;

    neonLights.push(beam);
    scene.add(beam);
  });
}

// ============================================
// UPDATE BACKGROUND - Call in render loop
// ============================================
export function updateBackground(time, mouseX = 0, mouseY = 0) {
  if (backgroundMaterial) {
    backgroundMaterial.uniforms.time.value = time;
    backgroundMaterial.uniforms.mousePos.value.set(mouseX, mouseY);
  }

  // Update floating particles
  if (floatingParticles) {
    const positions = floatingParticles.geometry.attributes.position.array;
    const speeds = floatingParticles.geometry.userData.speeds;

    for (let i = 0; i < positions.length / 3; i++) {
      // Gentle floating motion
      positions[i * 3 + 1] += Math.sin(time * speeds[i] + i) * 0.002;
      positions[i * 3] += Math.cos(time * speeds[i] * 0.5 + i) * 0.001;

      // Reset if too far
      if (positions[i * 3 + 1] > 10) {
        positions[i * 3 + 1] = -8;
      }
    }
    floatingParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Update neon light beams
  neonLights.forEach((beam) => {
    if (beam.material.uniforms) {
      beam.material.uniforms.time.value = time;
    }
  });
}

// ============================================
// SETUP ENVIRONMENT
// ============================================
export function setupEnvironment() {
  const envMap = createEnvMap();
  scene.environment = envMap;

  // Use immersive 3D background instead of flat texture
  createImmersiveBackground();

  // Set scene background to null (we render our own)
  scene.background = new THREE.Color(0x050308);

  return envMap;
}
