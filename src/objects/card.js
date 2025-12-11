import * as THREE from 'three';
import { CONFIG, CARDS_DATA } from '../config.js';
import { createCardTexture, createCardBackTexture, getPreloadedTexture } from '../utils/textures.js';
import { createHoloMaterial } from '../utils/shaders.js';
import { createHoloShaderMaterial } from '../utils/holoShader.js';

// ============================================
// CARD FACTORY
// ============================================
let envMapRef = null;

export function setEnvMap(envMap) {
  envMapRef = envMap;
}

export function createCard(index) {
  const { width, height, bevelSize, depth } = CONFIG.card;
  const data = CARDS_DATA[index];
  const isHolo = data.rarity === 'legendary' || data.rarity === 'mythic';

  // 1. Geometry: BoxGeometry for perfect UV mapping (Visuals > Geometry Detail for now)
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // 2. Materials - use preloaded image if available, otherwise generate
  let frontTex;
  if (data.image) {
    frontTex = getPreloadedTexture(data.image);
  }
  if (!frontTex) {
    frontTex = createCardTexture(data, index);
  }
  const backTex = createCardBackTexture();

  // Center textures
  frontTex.center.set(0.5, 0.5);
  backTex.center.set(0.5, 0.5);

  // Base Params
  const matParams = {
    roughness: 0.8, // Very matte paper
    metalness: 0.0, // No metal
    specularIntensity: 0, // CRITICAL: Removes the reflection of the light source entirely
    clearcoat: 0.0, // No coat
    envMap: envMapRef,
    envMapIntensity: 0.0 // No env reflections
  };

  // Front Material
  // We use our Custom Holo Shader which works without Scene Lights
  const frontMaterial = createHoloShaderMaterial(frontTex, isHolo);

  /* REPLACE OLD MATERIAL LOGIC
  // Use robust standard material for all cards to avoid shader crashes/transparency
  // We simulate "Holo" using Physical Material Iridescence property (Three.js standard)
  const holoParams = isHolo ? {
    metalness: 0.2, // Low metal even for holo to avoid flash
    roughness: 0.4,
    iridescence: 0.8,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [100, 400],
    specularIntensity: 0.5 // Allow slight shimmer for holo only
  } : {};

  frontMaterial = new THREE.MeshPhysicalMaterial({
    ...matParams,
    map: frontTex,
    ...holoParams
  });
  */

  const backMaterial = new THREE.MeshPhysicalMaterial({
    ...matParams,
    map: backTex,
    roughness: 0.4
  });

  // 4. Geometry Generation (Rounded Corner Shape)
  // We use ExtrudeGeometry to get real rounded corners and thickness.
  // CRITICAL: We must correct UVs because ExtrudeGeometry keeps world coords.

  const createRoundedCardGeometry = (w, h, r, d) => {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + r, y + h);
    shape.lineTo(x + w - r, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    shape.lineTo(x, y + h - r);
    shape.quadraticCurveTo(x, y + h, x + r, y + h);

    const extrudeSettings = {
      depth: d,
      bevelEnabled: false, // Clean edges
      curveSegments: 16 // Smooth corners
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // FIX UV MAPPING
    // ExtrudeGeometry UVs are in world space (e.g., -1.2 to 1.2).
    // We need to normalize them to 0..1 for the texture to cover the card.
    const uvAttribute = geometry.attributes.uv;
    const posAttribute = geometry.attributes.position;

    // Bounding box logic implies our shape is centered-ish but Extrude puts Z at 0 to depth.
    // We want to center the geometry in Z as well? Or just leave it.
    // Let's Center the geometry first so rotation is correct.
    geometry.center();

    for (let i = 0; i < uvAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);

      // Map x from [-w/2, w/2] to [0, 1]
      const u = (x / w) + 0.5;
      // Map y from [-h/2, h/2] to [0, 1]
      const v = (y / h) + 0.5;

      uvAttribute.setXY(i, u, v);
    }

    return geometry;
  };

  // 5. Mesh Creation with Multi-Material
  // 0: Front (because we fixed UVs, top/bottom faces map to 0/1)
  // But wait, ExtrudeGeometry groups are: 0 = Side, 1 = Top (Front/Back caps).
  // Actually it's: 0: Tube (Sides), 1: Cap (Front/Back)

  // We need to verify standard Extrude materials index.
  // Usually: material 0 is sides, material 1 is caps (front/back).
  // So [sideMaterial, frontMaterial]
  // BUT we want different front and back?
  // ExtrudeGeometry doesn't support separate Front/Back materials easily (they are both "Cap").
  // TRICK: We can copy the geometry for the back or use a Box with rounded transparent pngs.
  // BETTER TRICK: We use the remapped UVs. The Front texture will show on Front AND Back.
  // The Back texture needs to be different.

  // Solution: 2 Meshes (Back-to-back) OR Custom UV flipping?
  // Easiest "AAA" approach: 
  // 1. Create the card mesh with Front Material (applied to both sides).
  // 2. Clone it, flip 180 Y, apply Back Material, and slightly offset? No, Z-fighting.

  // Let's stick to the Robust Box for separate Front/Back, but use an Alpha Map for rounded corners?
  // User rejected "buggy edges". Alpha Test often leaves jagged edges.

  // PLAN:
  // Use ExtrudeGeometry. 
  // Material 0: Side (Gold/Dark)
  // Material 1: Front
  // We need a separate object for the Back?
  // Actually, let's create TWO thin Extruded shapes back-to-back?
  // Or simply: 
  // MeshFront = Extrude(depth/2)
  // MeshBack = Extrude(depth/2), rotated Y 180.

  // Let's do the "Double Mesh" approach inside the Group.
  // CardGroup
  //   |-- FrontMesh (Extrude depth/2, Mat=Front)
  //   |-- BackMesh (Extrude depth/2, Mat=Back, RotY=180, Z=-depth/2)

  const group = new THREE.Group();
  const halfDepth = CONFIG.card.depth / 2; // Use CONFIG.card.depth
  const frontGeo = createRoundedCardGeometry(CONFIG.card.width, CONFIG.card.height, 0.15, halfDepth); // slightly rounder 0.15

  // Clean materials array for Extrude: [Side, Cap]
  const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });

  // Mesh 1: Front
  // ExtrudeGeometry materials: [Cap (Face), Side] (or vice versa? Let's try Cap first based on behavior)
  const frontMesh = new THREE.Mesh(frontGeo, [frontMaterial, sideMaterial]);
  frontMesh.castShadow = false;
  frontMesh.receiveShadow = true;
  // Extrude output is centered. Front face is at Z=+halfDepth/2.
  frontMesh.position.z = halfDepth / 2;

  // Mesh 2: Back
  const backMesh = new THREE.Mesh(frontGeo, [backMaterial, sideMaterial]);
  backMesh.receiveShadow = true;
  // Rotate 180 to show the "Cap" as the back
  backMesh.rotation.y = Math.PI;
  backMesh.position.z = -halfDepth / 2;
  backMesh.castShadow = false; // Ensure back doesn't cast shadow either

  group.add(frontMesh);
  group.add(backMesh);

  // Add a hidden "hit box" for easier raycasting?
  // proper raycasting should work on the meshes.
  group.userData.mainMesh = frontMesh; // For input.js

  /* 
  // FALLBACK BOX (Replaced)
  const geometry = new THREE.BoxGeometry(CONFIG.card.width, CONFIG.card.height, 0.01);
  const mesh = new THREE.Mesh(geometry, [
     sideMaterial, sideMaterial, sideMaterial, sideMaterial, frontMaterial, backMaterial 
  ]);
  group.add(mesh);
  */
  group.castShadow = true; // Apply to group for overall shadow casting
  group.receiveShadow = true; // Apply to group for overall shadow receiving
  group.userData = { index, data, revealed: false, isHolo };

  return group;
}
