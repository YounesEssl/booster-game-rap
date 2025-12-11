import * as THREE from 'three';

// ============================================
// FOIL SHADER (Optimized for wrappers)
// ============================================
export const FoilShader = {
    uniforms: {
        baseColor: { value: new THREE.Color(0xc0c0c0) },
        roughness: { value: 0.3 },
        metalness: { value: 1.0 },
        time: { value: 0 },
        noiseMap: { value: null }, // Simulates crinkles
        envMap: { value: null },
        envMapIntensity: { value: 1.0 }
    },
    vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
    fragmentShader: `
    uniform vec3 baseColor;
    uniform float roughness;
    uniform float metalness;
    uniform float time;
    uniform sampler2D noiseMap;
    uniform sampler2D envMap; // Assumes equirectangular or handled by Three.js internals if Cube
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // Pseudo-random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Simple iridescent color
    vec3 iridescent(float t) {
        return vec3(
            0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
            0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
            0.5 + 0.5 * cos(6.28318 * (t + 0.67))
        );
    }

    void main() {
      // Normal perturbation based on noise (crinkles)
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Iridescence based on view angle (fresnel-ish)
      float viewAngle = 1.0 - dot(normal, viewDir);
      vec3 rainbow = iridescent(viewAngle * 2.0 + vUv.x);

      // Mix base color with rainbow
      vec3 color = mix(baseColor, rainbow, 0.3 * metalness);

      // Highligths / Specular (very simple approximation)
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      vec3 halfVector = normalize(lightDir + viewDir);
      float NdotH = dot(normal, halfVector);
      float specular = pow(max(0.0, NdotH), 100.0 * (1.0 - roughness));

      gl_FragColor = vec4(color + specular, 1.0);
      
      // Tone mapping is applied by Three.js automatically in newer versions if standard material used,
      // but here we are raw shader. 
      // Ideally we should use NodeMaterial or onBeforeCompile to inject into StandardMaterial.
      
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
};

// ============================================
// HOLOGRAPHIC MATERIAL
// ============================================
// We will use onBeforeCompile to inject into MeshPhysicalMaterial
// This is better than raw ShaderMaterial as we keep shadows, environment maps etc.
export function createHoloMaterial(parameters) {
    const material = new THREE.MeshPhysicalMaterial(parameters);

    material.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        material.userData.shader = shader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
      #include <common>
      varying vec3 vViewDir;
      `
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
      #include <worldpos_vertex>
      vViewDir = normalize(cameraPosition - worldPosition.xyz);
      `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
      #include <common>
      uniform float time;
      varying vec3 vViewDir;

      vec3 sparkle(vec2 uv, float t) {
        float n = 0.0;
        // Simple sparkle noise logic here
        return vec3(1.0); // Placeholder
      }
      
      vec3 iridescent(float t) {
          return vec3(
              0.5 + 0.5 * cos(6.28318 * (t + 0.0)),
              0.5 + 0.5 * cos(6.28318 * (t + 0.33)),
              0.5 + 0.5 * cos(6.28318 * (t + 0.67))
          );
      }
      `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
      #include <map_fragment>
      
      // Calculate Holographic Effect
      vec3 viewDir = normalize(vViewDir);
      vec3 normal = normalize(vNormal);
      float angle = dot(viewDir, normal);
      
      // Rainbow shift
      vec3 holoColor = iridescent(angle * 3.0 + vMapUv.x * 2.0);
      
      // Apply to diffuse color based on metalness/defined mask
      // For now, apply globally if metalness is high
      float holoStrength = metalnessFactor * 0.5;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * holoColor * 1.5, holoStrength);
      `
        );
    };

    return material;
}

export function updateMaterialTime(material, time) {
    if (material.userData.shader) {
        material.userData.shader.uniforms.time.value = time;
    }
}
