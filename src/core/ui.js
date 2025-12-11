import { state } from './state.js';

// ============================================
// UI UPDATES
// ============================================
export function updateUI() {
  const instructions = document.getElementById('instructions');
  const resetBtn = document.getElementById('reset-btn');

  switch (state.phase) {
    case 'idle':
      instructions.textContent = 'Cliquez pour ouvrir';
      instructions.style.opacity = '1';
      resetBtn.classList.remove('visible');
      break;
    case 'opening':
      instructions.style.opacity = '0';
      break;
    case 'revealing':
      instructions.textContent = `Cliquez pour révéler (${state.revealIndex + 1}/5)`;
      instructions.style.opacity = '1';
      break;
    case 'done':
      instructions.textContent = 'Collection complète';
      instructions.style.opacity = '1';
      resetBtn.classList.add('visible');
      break;
  }
}

export function showLoading() {
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.textContent = 'Chargement...';
    instructions.style.opacity = '1';
  }
}
