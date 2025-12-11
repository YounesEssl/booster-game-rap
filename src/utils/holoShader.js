import * as THREE from 'three';

// Vertex Shader: Standard but passes view direction
const vertexShader = `
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
`;

// Fragment Shader: Holo effect based on view angle
const fragmentShader = `
  uniform sampler2D map;
  uniform float time;
  uniform float opacity;
  uniform vec3 color;
  uniform bool isHolo;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Rainbow gradient function
  vec3 perturbation(vec3 coords) {
      return coords; // Placeholder for noise if needed
  }

  void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // View Direction
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    
    // Calculate angle between view and normal (Fresnel-like)
    float viewDot = dot(viewDir, normal);
    
    // Holo Effect
    vec3 finalColor = texColor.rgb;
    
    if (isHolo) {
        // Create a moving band based on view angle and time (optional)
        float angle = viewDot * 3.0 + vUv.y * 2.0;
        
        // Rainbow colors
        // Rainbow colors
        float r = sin(angle + 0.0) * 0.5 + 0.5;
        float g = sin(angle + 2.0) * 0.5 + 0.5;
        float b = sin(angle + 4.0) * 0.5 + 0.5;
        vec3 rainbow = vec3(r, g, b);
        
        // Removed white shine bands ("ugly bands")
        
        // Mix Texture with Rainbow Shine
        // Gold/Rainbow tint
        finalColor += rainbow * 0.4 * (1.0 - viewDot); // Slightly increased intensity for rainbow to compensate
    } else {
        // Subtle sheen for common cards too?
        float sheen = smoothstep(0.8, 1.0, 1.0 - viewDot);
        finalColor += vec3(sheen) * 0.1; // Very subtle rim lighting
    }

    gl_FragColor = vec4(finalColor, texColor.a * opacity);
    
    // Tonemapping check (simple clamp)
    // gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0/2.2)); // Gamma correction if needed
  }
`;

export function createHoloShaderMaterial(texture, isHolo) {
    return new THREE.ShaderMaterial({
        uniforms: {
            map: { value: texture },
            time: { value: 0 },
            opacity: { value: 1.0 },
            color: { value: new THREE.Color(0xffffff) },
            isHolo: { value: isHolo }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.FrontSide
    });
}

// Update loop helper
export function updateHoloTime(scene, time) {
    scene.traverse((obj) => {
        if (obj.material && obj.material.uniforms && obj.material.uniforms.time) {
            obj.material.uniforms.time.value = time;
        }
    });
}
