import * as THREE from 'three';

// ============================================
// HELPERS
// ============================================
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function addNoise(ctx, w, h, amount = 0.05) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * amount * 255;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawHexPattern(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; // Very subtle
  ctx.lineWidth = 1;
  const size = 30;
  for (let y = 0; y < h + size; y += size * 1.5) {
    for (let x = 0; x < w + size; x += size * Math.sqrt(3)) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(x + size * Math.cos(i * Math.PI / 3), y + size * Math.sin(i * Math.PI / 3));
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ============================================
// CYBERPUNK PATTERNS
// ============================================
function drawCyberpunkGrid(ctx, w, h) {
  ctx.save();

  // Perspective grid lines
  ctx.strokeStyle = 'rgba(255, 100, 200, 0.08)';
  ctx.lineWidth = 1;

  // Horizontal lines with perspective
  for (let i = 0; i < 20; i++) {
    const y = h * 0.4 + (i * i * 2);
    if (y > h) break;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Vertical lines converging
  const vanishY = h * 0.3;
  for (let i = 0; i < 15; i++) {
    const x = (w / 14) * i;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(w / 2 + (x - w / 2) * 0.3, vanishY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNeonGlow(ctx, x, y, w, h, color, blur = 20) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();
  ctx.restore();
}

function drawCircuitPattern(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.06)';
  ctx.lineWidth = 1;

  // Random circuit-like paths
  for (let i = 0; i < 30; i++) {
    const startX = Math.random() * w;
    const startY = Math.random() * h;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;

    for (let j = 0; j < 5; j++) {
      // Move in right angles
      if (Math.random() > 0.5) {
        x += (Math.random() - 0.5) * 100;
      } else {
        y += (Math.random() - 0.5) * 100;
      }
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Node points
    ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================
// BOOSTER TEXTURES (High Res - Cyberpunk Edition)
// ============================================
export function createBoosterTexture(isFront) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;

  // 1. Deep cyberpunk background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a0612');
  bg.addColorStop(0.3, '#120a1a');
  bg.addColorStop(0.6, '#0d0818');
  bg.addColorStop(1, '#050308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Add cyberpunk grid perspective
  drawCyberpunkGrid(ctx, w, h);

  // 3. Circuit pattern overlay
  drawCircuitPattern(ctx, w, h);

  // 4. Neon border frame with glow
  const margin = 35;

  // Outer neon pink glow
  ctx.save();
  ctx.shadowColor = '#ff66aa';
  ctx.shadowBlur = 30;
  ctx.strokeStyle = '#ff66aa';
  ctx.lineWidth = 3;
  roundRect(ctx, margin, margin, w - margin * 2, h - margin * 2, 15);
  ctx.stroke();
  ctx.restore();

  // Inner cyan line
  ctx.save();
  ctx.shadowColor = '#66ddff';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#66ddff';
  ctx.lineWidth = 1.5;
  roundRect(ctx, margin + 12, margin + 12, w - (margin + 12) * 2, h - (margin + 12) * 2, 10);
  ctx.stroke();
  ctx.restore();

  if (isFront) {
    // 5. Top decorative element - Neon crown/wings
    ctx.save();
    ctx.shadowColor = '#ff66aa';
    ctx.shadowBlur = 25;

    // Wing left
    ctx.strokeStyle = '#ff66aa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 180, 200);
    ctx.quadraticCurveTo(cx - 250, 150, cx - 280, 180);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 180, 200);
    ctx.quadraticCurveTo(cx - 230, 120, cx - 250, 140);
    ctx.stroke();

    // Wing right (mirrored)
    ctx.beginPath();
    ctx.moveTo(cx + 180, 200);
    ctx.quadraticCurveTo(cx + 250, 150, cx + 280, 180);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 180, 200);
    ctx.quadraticCurveTo(cx + 230, 120, cx + 250, 140);
    ctx.stroke();
    ctx.restore();

    // 6. Central diamond/gem emblem
    ctx.save();
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 40;

    // Diamond shape
    const gradient = ctx.createLinearGradient(cx - 80, 280, cx + 80, 480);
    gradient.addColorStop(0, '#ffdd66');
    gradient.addColorStop(0.3, '#ffaa44');
    gradient.addColorStop(0.5, '#ff8833');
    gradient.addColorStop(0.7, '#ffaa44');
    gradient.addColorStop(1, '#ffdd66');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx, 280);      // Top
    ctx.lineTo(cx + 70, 380); // Right
    ctx.lineTo(cx, 500);      // Bottom
    ctx.lineTo(cx - 70, 380); // Left
    ctx.closePath();
    ctx.fill();

    // Inner shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, 300);
    ctx.lineTo(cx + 40, 370);
    ctx.lineTo(cx, 400);
    ctx.lineTo(cx - 40, 370);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. Main title with neon glow
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 120px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RAP LEGENDS', cx, 680);
    ctx.restore();

    // 8. Subtitle with cyan glow
    ctx.save();
    ctx.shadowColor = '#66ddff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#66ddff';
    ctx.font = '700 38px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLLECTORS EDITION', cx, 745);
    ctx.restore();

    // 9. Decorative neon lines
    ctx.save();
    ctx.shadowColor = '#ff66aa';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ff66aa';
    ctx.lineWidth = 2;

    // Left line
    ctx.beginPath();
    ctx.moveTo(cx - 280, 810);
    ctx.lineTo(cx - 100, 810);
    ctx.stroke();

    // Right line
    ctx.beginPath();
    ctx.moveTo(cx + 100, 810);
    ctx.lineTo(cx + 280, 810);
    ctx.stroke();

    // Center diamond
    ctx.fillStyle = '#ff66aa';
    ctx.beginPath();
    ctx.moveTo(cx, 800);
    ctx.lineTo(cx + 10, 810);
    ctx.lineTo(cx, 820);
    ctx.lineTo(cx - 10, 810);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 10. Japanese text accent (adds cyberpunk vibe)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 100, 170, 0.15)';
    ctx.font = '600 60px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ラップ', margin + 50, h - 350);
    ctx.textAlign = 'right';
    ctx.fillText('伝説', w - margin - 50, h - 350);
    ctx.restore();

    // 11. Bottom info panel
    ctx.save();
    // Panel background
    ctx.fillStyle = 'rgba(10, 5, 20, 0.7)';
    roundRect(ctx, margin + 60, h - 280, w - (margin + 60) * 2, 120, 10);
    ctx.fill();

    // Panel border
    ctx.shadowColor = '#66ddff';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, margin + 60, h - 280, w - (margin + 60) * 2, 120, 10);
    ctx.stroke();
    ctx.restore();

    // Card count
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5 PREMIUM CARDS', cx, h - 205);

    ctx.fillStyle = 'rgba(255, 170, 68, 0.8)';
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText('HOLOGRAPHIC SERIES', cx, h - 170);
    ctx.restore();

    // 12. Corner accents
    const cornerSize = 40;
    ctx.save();
    ctx.strokeStyle = '#ffaa44';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;

    // Top left
    ctx.beginPath();
    ctx.moveTo(margin + 5, margin + cornerSize);
    ctx.lineTo(margin + 5, margin + 5);
    ctx.lineTo(margin + cornerSize, margin + 5);
    ctx.stroke();

    // Top right
    ctx.beginPath();
    ctx.moveTo(w - margin - 5, margin + cornerSize);
    ctx.lineTo(w - margin - 5, margin + 5);
    ctx.lineTo(w - margin - cornerSize, margin + 5);
    ctx.stroke();

    // Bottom left
    ctx.beginPath();
    ctx.moveTo(margin + 5, h - margin - cornerSize);
    ctx.lineTo(margin + 5, h - margin - 5);
    ctx.lineTo(margin + cornerSize, h - margin - 5);
    ctx.stroke();

    // Bottom right
    ctx.beginPath();
    ctx.moveTo(w - margin - 5, h - margin - cornerSize);
    ctx.lineTo(w - margin - 5, h - margin - 5);
    ctx.lineTo(w - margin - cornerSize, h - margin - 5);
    ctx.stroke();
    ctx.restore();

    // 13. Holographic shine overlay
    const shine = ctx.createLinearGradient(0, 0, w, h);
    shine.addColorStop(0, 'rgba(255, 100, 200, 0)');
    shine.addColorStop(0.3, 'rgba(255, 100, 200, 0)');
    shine.addColorStop(0.45, 'rgba(255, 100, 200, 0.08)');
    shine.addColorStop(0.5, 'rgba(100, 220, 255, 0.12)');
    shine.addColorStop(0.55, 'rgba(255, 200, 100, 0.08)');
    shine.addColorStop(0.7, 'rgba(255, 100, 200, 0)');
    shine.addColorStop(1, 'rgba(255, 100, 200, 0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, w, h);

  } else {
    // BACK SIDE
    // Concentric neon rings
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const radius = 80 + i * 70;
      const alpha = 0.15 - i * 0.02;

      ctx.beginPath();
      ctx.arc(cx, h / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 100, 170, ${alpha})` : `rgba(100, 200, 255, ${alpha})`;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // Center logo
    ctx.save();
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffaa44';
    ctx.font = '900 180px "Bebas Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RL', cx, h / 2);
    ctx.restore();

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, h / 2, 130, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffaa44';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // 14. Subtle noise for texture
  addNoise(ctx, w, h, 0.025);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

// ============================================
// NORMAL MAP (High Res)
// ============================================
export function createNormalMapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; // Better detail
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 1024, 1024);

  const imageData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imageData.data;

  // Create "Paper/Foil" crinkle noise
  for (let i = 0; i < data.length; i += 4) {
    const scale = 20; // larger features
    // We want some large waves and small noise
    const noise = (Math.random() - 0.5) * 6;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  // Add folds
  ctx.strokeStyle = 'rgb(140, 140, 255)'; // Slight incline
  ctx.lineWidth = 40;
  ctx.filter = 'blur(10px)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 1024, 0);
    ctx.lineTo(Math.random() * 1024, 1024);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// ============================================
// CARD TEXTURES (High Res)
// ============================================
export function createCardTexture(data, index) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;  // Double res
  canvas.height = 1120;
  const ctx = canvas.getContext('2d');

  // Rarity Colors
  const rarityColors = {
    common: ['#4b5563', '#1f2937'],
    rare: ['#2563eb', '#1e3a8a'],
    epic: ['#9333ea', '#581c87'],
    legendary: ['#fbbf24', '#78350f'], // Gold
    mythic: ['#f87171', '#7f1d1d'] // Red
  };

  const colors = rarityColors[data.rarity] || data.colors;

  // 1. Background Gradient
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(1, colors[1]);
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 40);
  ctx.fill();

  // 2. Texture Overlay (Pattern)
  ctx.globalCompositeOperation = 'overlay';
  drawHexPattern(ctx, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  // 3. Inner Frame (Dark)
  const margin = 35;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, margin, margin, canvas.width - margin * 2, canvas.height - margin * 2, 20);
  ctx.fill();

  // Border Stroke
  ctx.strokeStyle = data.rarity === 'legendary' ? '#FCD34D' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // 4. Illustration Area
  ctx.fillStyle = '#111';
  const illusY = 140;
  const illusH = 450;
  roundRect(ctx, margin + 20, illusY, canvas.width - (margin + 20) * 2, illusH, 10);
  ctx.fill();

  // Abstract "Art" Gradient inside illustration
  const artGrad = ctx.createLinearGradient(0, illusY, canvas.width, illusY + illusH);
  artGrad.addColorStop(0, '#222');
  artGrad.addColorStop(0.5, colors[0]);
  artGrad.addColorStop(1, '#000');
  ctx.fillStyle = artGrad;
  ctx.globalAlpha = 0.8;
  roundRect(ctx, margin + 20, illusY, canvas.width - (margin + 20) * 2, illusH, 10);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Avatar Circle
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#EEE';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, illusY + illusH / 2, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 5. Header Stats
  // Rank #
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '700 32px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`#${String(index + 1).padStart(3, '0')}`, margin + 30, margin + 70);

  // HP
  ctx.textAlign = 'right';
  ctx.font = '800 48px "Inter", sans-serif';
  ctx.fillText(data.hp, canvas.width - margin - 30, margin + 75);
  ctx.font = '600 20px "Inter", sans-serif';
  ctx.fillText("HP", canvas.width - margin - 120, margin + 75);

  // 6. Name Plate
  const nameY = 660;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 80px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(data.name.toUpperCase(), canvas.width / 2, nameY);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#CCCCCC';
  ctx.font = 'italic 500 32px "Inter", sans-serif';
  ctx.fillText(data.subtitle, canvas.width / 2, nameY + 50);

  // 7. Ability Box
  const abilityY = 800;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, margin + 20, abilityY, canvas.width - (margin + 20) * 2, 180, 15);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFF';
  ctx.font = '700 36px "Inter", sans-serif';
  ctx.fillText("Freestyle Fatal", margin + 50, abilityY + 60);

  ctx.fillStyle = '#AAA';
  ctx.font = '400 28px "Inter", sans-serif';
  ctx.fillText("Inflige des dégâts critiques à la street.", margin + 50, abilityY + 110);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#D4AF37'; // Gold
  ctx.font = '800 50px "Inter", sans-serif';
  ctx.fillText(`${70 + index * 10}`, canvas.width - margin - 50, abilityY + 100);

  // 8. Footer (Rarity)
  const footerY = 1060;
  ctx.textAlign = 'center';
  ctx.fillStyle = data.rarity === 'legendary' ? '#FCD34D' : '#9CA3AF';
  ctx.font = '700 28px "Inter", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`★ ${data.rarity.toUpperCase()} EDITION ★`, canvas.width / 2, footerY);

  // 9. Noise
  addNoise(ctx, canvas.width, canvas.height, 0.03);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

export function createCardBackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1120;
  const ctx = canvas.getContext('2d');

  // Dark Geometric Back
  const bg = ctx.createRadialGradient(400, 560, 0, 400, 560, 800);
  bg.addColorStop(0, '#2e3b4e');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 40);
  ctx.fill();

  // Pattern
  drawHexPattern(ctx, canvas.width, canvas.height);

  // Center Logo
  ctx.beginPath();
  ctx.arc(400, 560, 150, 0, Math.PI * 2);
  ctx.strokeStyle = '#3b82f6'; // Blue ring
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(400, 560, 120, 0, Math.PI * 2);
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 20;
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.font = '900 140px "Bebas Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("RL", 400, 570);

  addNoise(ctx, canvas.width, canvas.height, 0.05);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}
