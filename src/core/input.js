import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { state } from './state.js';
import { openBooster, revealCard, dismissCurrentCard } from './animations.js';
import { renderer, camera, handleResize } from './scene.js';

// ============================================
// INPUT HANDLERS
// ============================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function updateHoverState(x, y) {
  // Normalize mouse position
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check intersections with Booster if idle
  if (state.phase === 'idle' && state.booster) {
    const mainMesh = state.booster.userData.mainMesh || state.booster;
    const intersects = raycaster.intersectObject(mainMesh, true);
    document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default';

    // Scale effect on hover - DISABLED as per user request
    // if (intersects.length > 0) {
    //   if (state.booster.scale.x < 1.05) {
    //     state.booster.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.1);
    //   }
    // }
  } else if (state.phase === 'revealing') {
    // Check intersections with cards
    // Optimization: only check if simple box
    const intersects = raycaster.intersectObjects(state.cards);
    document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  } else {
    document.body.style.cursor = 'default';
  }
}

function onPointerDown(e) {
  const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

  state.isInteracting = true;
  state.hasMoved = false;
  state.isDragging = true;
  state.dragStart = { x, y };
  state.lastPointer = { x, y };
  state.rotationVelocity = { x: 0, y: 0 };

  updateHoverState(x, y);
}

function onPointerMove(e) {
  const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

  updateHoverState(x, y);

  if (state.isDragging) {
    const deltaX = x - state.lastPointer.x;
    const deltaY = y - state.lastPointer.y;

    // Determine target: Booster, Focused Card, or Card Stack
    let target = null;
    let targets = null; // For multiple targets (card stack)

    if (state.phase === 'idle') {
      target = state.booster;
    } else if (state.focusedCard) {
      target = state.focusedCard;
    } else if (state.phase === 'revealing' && !state.focusedCard) {
      // Manipulate the whole card stack
      targets = state.cards.filter(c => c.visible);
    }

    if (target) {
      target.rotation.y += deltaX * CONFIG.drag.sensitivity;
      target.rotation.x += deltaY * CONFIG.drag.sensitivity;

      // CLAMP Vertical Rotation to avoid flipping upside down (Gimbal lock confusion)
      target.rotation.x = Math.max(-1.0, Math.min(1.0, target.rotation.x));

      // Update state.rotation as the SOURCE OF TRUTH
      state.rotation.y += deltaX * CONFIG.drag.sensitivity;
      state.rotation.x += deltaY * CONFIG.drag.sensitivity;
      state.rotation.x = Math.max(-1.0, Math.min(1.0, state.rotation.x));

      // Update velocity for inertia
      state.rotationVelocity.x = deltaY * CONFIG.drag.sensitivity;
      state.rotationVelocity.y = deltaX * CONFIG.drag.sensitivity;
    }

    // Handle card pile manipulation - rotate the whole group
    if (state.cardPile && state.phase === 'revealing' && !state.focusedCard) {
      state.rotation.y += deltaX * CONFIG.drag.sensitivity * 1.5;
      state.rotation.x += deltaY * CONFIG.drag.sensitivity * 1.5;
      state.rotation.x = Math.max(-0.8, Math.min(0.8, state.rotation.x));
      state.rotation.y = Math.max(-1.2, Math.min(1.2, state.rotation.y));

      // Rotate the entire pile group
      state.cardPile.rotation.y = Math.PI + state.rotation.y;
      state.cardPile.rotation.x = state.rotation.x;

      state.rotationVelocity.x = deltaY * CONFIG.drag.sensitivity;
      state.rotationVelocity.y = deltaX * CONFIG.drag.sensitivity;
    }

    state.lastPointer = { x, y };

    const totalDelta = Math.abs(x - state.dragStart.x) + Math.abs(y - state.dragStart.y);
    if (totalDelta > 5) {
      state.hasMoved = true;
    }
  }
}

function onPointerUp(e) {
  state.isInteracting = false;
  state.isDragging = false;

  // Check for swipe gesture on focused card
  if (state.hasMoved && state.focusedCard && state.phase === 'revealing') {
    const swipeX = (e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - state.dragStart.x;
    const swipeThreshold = 80; // pixels

    if (Math.abs(swipeX) > swipeThreshold) {
      // Swipe detected - dismiss current card
      dismissCurrentCard();
      return;
    }
  }

  if (!state.hasMoved) {
    handleClick(e);
  }
}

function handleClick(e) {
  // Debounce/Lock logic handled in animations/state
  if (state.phase === 'idle') {
    // Raycast check for booster
    raycaster.setFromCamera(mouse, camera);
    const mainMesh = state.booster.userData.mainMesh || state.booster;
    if (raycaster.intersectObject(mainMesh, true).length > 0) {
      openBooster();
    }
  } else if (state.phase === 'revealing') {
    // If we have a focused card, clicking dismisses it (Next)
    // If we don't, clicking reveals the next one (if available)
    // Actually, revealCard handles both: if focused, dismisses; if not, reveals.
    revealCard();
  }
}

// ============================================
// SETUP INPUT LISTENERS
// ============================================
export function setupInputListeners(composer, initCallback) {
  renderer.domElement.addEventListener('mousedown', onPointerDown);
  renderer.domElement.addEventListener('mousemove', onPointerMove);
  renderer.domElement.addEventListener('mouseup', onPointerUp);
  renderer.domElement.addEventListener('mouseleave', () => {
    state.isInteracting = false;
    state.isDragging = false;
  });

  renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: false }); // non-passive to prevent scroll?
  renderer.domElement.addEventListener('touchmove', onPointerMove, { passive: false });
  renderer.domElement.addEventListener('touchend', onPointerUp);

  document.getElementById('reset-btn').addEventListener('click', initCallback);

  window.addEventListener('resize', () => handleResize(composer));
}
