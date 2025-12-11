import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createBoosterTexture, createNormalMapTexture } from '../utils/textures.js';
import { scene } from '../core/scene.js';

// ============================================
// BOOSTER FACTORY - TEARABLE VERSION
// ============================================

let envMapRef = null;

export function setEnvMap(envMap) {
  envMapRef = envMap;
}

// Holographic foil shader for premium look
function createHoloFoilMaterial(texture, normalMap) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      normalMap: { value: normalMap },
      time: { value: 0 },
      holoIntensity: { value: 0.4 },
      fresnelPower: { value: 2.5 },
      opacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform sampler2D normalMap;
      uniform float time;
      uniform float holoIntensity;
      uniform float fresnelPower;
      uniform float opacity;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      vec3 rainbow(float t) {
        return vec3(
          sin(t * 6.28318) * 0.5 + 0.5,
          sin(t * 6.28318 + 2.094) * 0.5 + 0.5,
          sin(t * 6.28318 + 4.188) * 0.5 + 0.5
        );
      }

      void main() {
        vec4 texColor = texture2D(map, vUv);
        vec3 normalTex = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
        vec3 normal = normalize(vNormal + normalTex * 0.3);
        vec3 viewDir = normalize(vViewPosition);

        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), fresnelPower);
        float holoAngle = dot(normal, viewDir) * 3.0 + vUv.y * 2.0 + time * 0.3;
        vec3 holoColor = rainbow(holoAngle);

        vec3 iridescentColor = mix(
          vec3(1.0, 0.4, 0.7),
          vec3(0.4, 0.8, 1.0),
          dot(normal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5 + sin(time * 0.5) * 0.2
        );

        vec3 finalColor = texColor.rgb;
        finalColor += holoColor * fresnel * holoIntensity * 0.5;
        finalColor += iridescentColor * fresnel * 0.3;
        finalColor += vec3(1.0, 0.95, 0.9) * smoothstep(0.3, 0.7, fresnel) * 0.4;

        float shimmer = sin(vUv.x * 50.0 + time * 2.0) * sin(vUv.y * 50.0 - time * 1.5);
        finalColor += vec3(1.0) * smoothstep(0.8, 1.0, shimmer) * 0.15 * fresnel;

        gl_FragColor = vec4(finalColor, opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  return material;
}

// Neon seam material
function createSeamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(0xffaa44) },
      glowColor: { value: new THREE.Color(0xff66aa) },
      opacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 glowColor;
      uniform float opacity;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
        float pulse = sin(vUv.x * 30.0 + time * 3.0) * 0.5 + 0.5;

        vec3 color = mix(baseColor, glowColor, pulse * 0.3 + fresnel * 0.5);
        color += vec3(1.0) * fresnel * 0.5;

        gl_FragColor = vec4(color, opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export async function createBooster() {
  const group = new THREE.Group();

  const width = CONFIG.booster.width;
  const height = CONFIG.booster.height;
  const depth = CONFIG.booster.depth;

  // Tear line at 70% from bottom (30% from top)
  const tearRatio = 0.7;
  const tearLineY = -height / 2 + height * tearRatio; // Position in local coords

  const frontTex = createBoosterTexture(true);
  const backTex = createBoosterTexture(false);
  const normalMap = createNormalMapTexture();

  // ==========================================
  // CREATE TOP HALF (will tear off) - 30% of height
  // ==========================================
  const topHalf = new THREE.Group();
  const topHeight = height * (1 - tearRatio); // 30% of total height

  const topGeo = new THREE.BoxGeometry(width, topHeight, depth, 8, 8, 2);
  const topPos = topGeo.attributes.position;
  const topUv = topGeo.attributes.uv;

  // Adjust UVs so texture maps correctly to top portion
  for (let i = 0; i < topUv.count; i++) {
    const v = topUv.getY(i);
    // Map UV Y from [0,1] to [0.7, 1] (top 30%)
    topUv.setY(i, tearRatio + v * (1 - tearRatio));
  }

  // Add pillow bulge
  for (let i = 0; i < topPos.count; i++) {
    const x = topPos.getX(i);
    const y = topPos.getY(i);
    const z = topPos.getZ(i);
    const normalizedX = x / (width / 2);
    const normalizedY = y / (topHeight / 2);
    const bulge = Math.cos(normalizedX * Math.PI * 0.4) * Math.cos(normalizedY * Math.PI * 0.4) * 0.08;
    if (z > 0) topPos.setZ(i, z + bulge);
    if (z < 0) topPos.setZ(i, z - bulge);
  }
  topGeo.computeVertexNormals();

  const topMat = createHoloFoilMaterial(frontTex, normalMap);
  const topMesh = new THREE.Mesh(topGeo, topMat);
  // Position top half so its bottom edge is at tearLineY
  topMesh.position.y = tearLineY + topHeight / 2;
  topHalf.add(topMesh);

  // Top crimp/seal at very top
  const topCrimpGeo = new THREE.PlaneGeometry(width, 0.2, 20, 2);
  const topCrimpPos = topCrimpGeo.attributes.position;
  for (let i = 0; i < topCrimpPos.count; i++) {
    const x = topCrimpPos.getX(i);
    topCrimpPos.setZ(i, Math.sin(x * 40) * 0.015 + depth / 2 + 0.01);
  }
  topCrimpGeo.computeVertexNormals();

  const topCrimpMat = createSeamMaterial();
  const topCrimp = new THREE.Mesh(topCrimpGeo, topCrimpMat);
  topCrimp.position.y = height / 2 - 0.1;
  topHalf.add(topCrimp);

  group.add(topHalf);

  // ==========================================
  // CREATE BOTTOM HALF (stays, then falls) - 70% of height
  // ==========================================
  const bottomHalf = new THREE.Group();
  const bottomHeight = height * tearRatio; // 70% of total height

  const bottomGeo = new THREE.BoxGeometry(width, bottomHeight, depth, 8, 8, 2);
  const bottomPos = bottomGeo.attributes.position;
  const bottomUv = bottomGeo.attributes.uv;

  // Adjust UVs so texture maps correctly to bottom portion
  for (let i = 0; i < bottomUv.count; i++) {
    const v = bottomUv.getY(i);
    // Map UV Y from [0,1] to [0, 0.7] (bottom 70%)
    bottomUv.setY(i, v * tearRatio);
  }

  for (let i = 0; i < bottomPos.count; i++) {
    const x = bottomPos.getX(i);
    const y = bottomPos.getY(i);
    const z = bottomPos.getZ(i);
    const normalizedX = x / (width / 2);
    const normalizedY = y / (bottomHeight / 2);
    const bulge = Math.cos(normalizedX * Math.PI * 0.4) * Math.cos(normalizedY * Math.PI * 0.4) * 0.1;
    if (z > 0) bottomPos.setZ(i, z + bulge);
    if (z < 0) bottomPos.setZ(i, z - bulge);
  }
  bottomGeo.computeVertexNormals();

  const bottomMat = createHoloFoilMaterial(frontTex, normalMap);
  const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
  // Position bottom half so its top edge is at tearLineY
  bottomMesh.position.y = tearLineY - bottomHeight / 2;
  bottomHalf.add(bottomMesh);

  // Bottom crimp/seal at very bottom
  const bottomCrimpGeo = new THREE.PlaneGeometry(width, 0.2, 20, 2);
  const bottomCrimpPos = bottomCrimpGeo.attributes.position;
  for (let i = 0; i < bottomCrimpPos.count; i++) {
    const x = bottomCrimpPos.getX(i);
    bottomCrimpPos.setZ(i, Math.sin(x * 40) * 0.015 + depth / 2 + 0.01);
  }
  bottomCrimpGeo.computeVertexNormals();

  const bottomCrimpMat = createSeamMaterial();
  const bottomCrimp = new THREE.Mesh(bottomCrimpGeo, bottomCrimpMat);
  bottomCrimp.position.y = -height / 2 + 0.1;
  bottomHalf.add(bottomCrimp);

  group.add(bottomHalf);

  // ==========================================
  // CREATE TEAR LINE (the edge that tears)
  // ==========================================
  const tearLineGeo = new THREE.PlaneGeometry(width + 0.1, 0.1, 30, 1);
  const tearLineMat = new THREE.MeshBasicMaterial({
    color: 0xff66aa,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const tearLine = new THREE.Mesh(tearLineGeo, tearLineMat);
  tearLine.position.y = tearLineY;
  tearLine.position.z = depth / 2 + 0.02; // Slightly in front
  tearLine.visible = false; // Will glow during tear
  group.add(tearLine);

  // Store all materials for time updates
  const allMaterials = [topMat, bottomMat, topCrimpMat, bottomCrimpMat];

  // Store references
  group.userData = {
    topHalf,
    bottomHalf,
    topMesh,
    bottomMesh,
    topCrimp,
    bottomCrimp,
    tearLine,
    tearLineY,
    mainMesh: bottomMesh,
    materials: allMaterials,
    width,
    height,
    depth,
  };

  return group;
}

// ==========================================
// CREATE TEAR DEBRIS PIECES
// ==========================================
export function createTearDebris(position, count = 12) {
  const debris = [];
  const normalMap = createNormalMapTexture();

  for (let i = 0; i < count; i++) {
    // Random shaped debris
    const w = 0.1 + Math.random() * 0.3;
    const h = 0.05 + Math.random() * 0.15;
    const geo = new THREE.PlaneGeometry(w, h);

    const mat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xffaa44 : 0xff66aa,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const piece = new THREE.Mesh(geo, mat);
    piece.position.copy(position);
    piece.position.x += (Math.random() - 0.5) * 2;
    piece.position.y += (Math.random() - 0.5) * 0.5;
    piece.position.z += Math.random() * 0.3;

    // Random rotation
    piece.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Physics properties
    piece.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 4 + 2
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      life: 1.5 + Math.random() * 0.5,
      maxLife: 1.5 + Math.random() * 0.5,
    };

    scene.add(piece);
    debris.push(piece);
  }

  return debris;
}

// Update debris physics
export function updateDebris(debris, dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const piece = debris[i];
    const data = piece.userData;

    data.life -= dt;

    if (data.life <= 0) {
      scene.remove(piece);
      debris.splice(i, 1);
      continue;
    }

    // Gravity
    data.velocity.y -= 12 * dt;

    // Move
    piece.position.addScaledVector(data.velocity, dt);

    // Rotate
    piece.rotation.x += data.angularVelocity.x * dt;
    piece.rotation.y += data.angularVelocity.y * dt;
    piece.rotation.z += data.angularVelocity.z * dt;

    // Fade
    const lifeRatio = data.life / data.maxLife;
    piece.material.opacity = lifeRatio;

    // Air resistance
    data.velocity.multiplyScalar(0.99);
  }
}

// Update booster shader time
export function updateBoosterTime(booster, time) {
  if (!booster || !booster.userData.materials) return;

  booster.userData.materials.forEach(mat => {
    if (mat.uniforms && mat.uniforms.time) {
      mat.uniforms.time.value = time;
    }
  });
}
