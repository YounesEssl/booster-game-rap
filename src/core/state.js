// ============================================
// APPLICATION STATE
// ============================================
export const state = {
  phase: 'idle',
  booster: null,
  cards: [],
  cardPile: null, // Group containing all cards for rotation
  revealIndex: 0,
  focusedCard: null,
  tilt: { x: 0, y: 0 },
  targetTilt: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  isInteracting: false,
  hasMoved: false,
  idleTime: 0,

  // Drag libre pour rotation complète
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  rotation: { x: 0, y: 0 },
  rotationVelocity: { x: 0, y: 0 },
  lastPointer: { x: 0, y: 0 },
};

export function resetState() {
  state.phase = 'idle';
  state.cards = [];
  state.cardPile = null;
  state.revealIndex = 0;
  state.tilt = { x: 0, y: 0 };
  state.targetTilt = { x: 0, y: 0 };
  state.velocity = { x: 0, y: 0 };
  state.idleTime = 0;
  state.rotation = { x: 0, y: 0 };
  state.rotationVelocity = { x: 0, y: 0 };
  state.isDragging = false;
}
