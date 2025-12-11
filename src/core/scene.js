import * as THREE from 'three';

// ============================================
// SCENE SETUP
// ============================================
export const scene = new THREE.Scene();

// Camera avec FOV naturel
export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5.5);

// Renderer avec tone mapping pro
export const renderer = new THREE.WebGLRenderer({
  antialias: false, // Post-processing SMAA handles aliasing, so native AA is overhead.
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
// Optimization: Cap pixel ratio at 2.0. 
// 1.5 was too blurry for text. 2.0 is the sweet spot for Retina.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));

// Tone mapping ACES pour un rendu cinématique
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Slightly brighter to compensate
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ============================================
// LIGHTING
// ============================================
export function setupLights() {
  // 1. Ambient Light - SOLE LIGHT SOURCE (Flat Lighting)
  const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
  scene.add(ambientLight);

  // 2. Key Light REMOVED as per user request ("Enlever cette light")
  // No directional light = No shadows, no specular reflections, no gradient.

  // Fill light removed to eliminate stray reflections. 
  // We rely on Ambient Light (1.5) for fill.

  // Removed Rim and Accent lights to eliminate all "light dots/reflections"
  // (User request: "on a un autre point de lumiere qu'on ne veut pas")

  // Plan de sol invisible pour les ombres
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -2.5;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // 5. Environment / Fog - Disabled to show immersive background
  // scene.fog = new THREE.FogExp2(0x111111, 0.04);
  // scene.background = new THREE.Color(0x111111);

  // Optional: Subtle volumetric-like background glow (using a large sprite or mesh behind)
  const bgGeo = new THREE.PlaneGeometry(30, 30);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x222222,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.5,
  });
}


// ============================================
// MOUNT RENDERER
// ============================================
export function mountRenderer() {
  document.getElementById('app').appendChild(renderer.domElement);
}

// ============================================
// RESIZE HANDLER
// ============================================
export function handleResize(composer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  // Responsive Camera Distance
  // Mobile screens are narrow. To fill the width, we need to be close enough.
  // Z=14 was too far (object tiny). Z=6.5 fills ~80% of width on portrait.
  const isMobile = window.innerWidth < 768;
  const targetZ = isMobile ? 6.5 : 8.5;
  camera.position.z = targetZ;
}
