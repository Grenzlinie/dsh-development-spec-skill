import { FAILURE_TIME, LOCK_RADIUS, signalDistance, targetAt, type GameState } from './game';

export interface Viewport {
  width: number;
  height: number;
}

function glowLine(context: CanvasRenderingContext2D, color: string, width: number): void {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.shadowColor = color;
  context.shadowBlur = width * 4;
}

function drawGrid(context: CanvasRenderingContext2D, size: number, time: number): void {
  context.save();
  context.strokeStyle = 'rgba(128, 240, 211, 0.11)';
  context.lineWidth = 1;
  for (let index = -4; index <= 4; index += 1) {
    const offset = (index / 4) * size;
    context.beginPath();
    context.moveTo(-size, offset);
    context.lineTo(size, offset);
    context.moveTo(offset, -size);
    context.lineTo(offset, size);
    context.stroke();
  }

  context.strokeStyle = 'rgba(244, 185, 72, 0.16)';
  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    context.arc(0, 0, (ring / 4) * size, 0, Math.PI * 2);
    context.stroke();
  }

  context.rotate(time * 0.12);
  const sweep = context.createLinearGradient(0, 0, size, 0);
  sweep.addColorStop(0, 'rgba(244,185,72,0.18)');
  sweep.addColorStop(1, 'rgba(244,185,72,0)');
  context.fillStyle = sweep;
  context.beginPath();
  context.moveTo(0, 0);
  context.arc(0, 0, size, -0.16, 0.16);
  context.closePath();
  context.fill();
  context.restore();
}

function drawWaveform(context: CanvasRenderingContext2D, width: number, height: number, state: GameState): void {
  context.save();
  context.translate(-width / 2, height * 0.38);
  context.beginPath();
  for (let x = 0; x <= width; x += 3) {
    const wave = Math.sin(x * 0.045 + state.elapsed * 3.2) * 5 + Math.sin(x * 0.013 - state.elapsed) * 3;
    const y = wave + Math.sin(x * 0.3 + state.disturbanceIndex) * Math.min(5, signalDistance(state) * 12);
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  glowLine(context, 'rgba(111, 237, 202, 0.38)', 1);
  context.stroke();
  context.restore();
}

export function renderGame(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewport: Viewport,
): void {
  const { width, height } = viewport;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#050c0c';
  context.fillRect(0, 0, width, height);
  const noise = context.createRadialGradient(width * 0.48, height * 0.46, 10, width / 2, height / 2, width * 0.6);
  noise.addColorStop(0, 'rgba(31, 85, 70, 0.3)');
  noise.addColorStop(0.5, 'rgba(8, 25, 24, 0.12)');
  noise.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  context.fillStyle = noise;
  context.fillRect(0, 0, width, height);

  drawWaveform(context, width, height, state);

  const radius = Math.min(width, height) * 0.39;
  const centerX = width / 2;
  const centerY = height / 2;
  context.save();
  context.translate(centerX, centerY);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.clip();
  drawGrid(context, radius, state.elapsed);

  const target = targetAt(state.elapsed);
  const targetX = target.x * radius;
  const targetY = target.y * radius;
  const danger = Math.min(1, state.offCourse / FAILURE_TIME);
  context.beginPath();
  context.arc(targetX, targetY, LOCK_RADIUS * radius, 0, Math.PI * 2);
  context.fillStyle = `rgba(244, 185, 72, ${0.04 + danger * 0.1})`;
  context.fill();
  glowLine(context, danger > 0.55 ? '#ff8a58' : '#f4b948', 2);
  context.setLineDash([6, 8]);
  context.lineDashOffset = -state.elapsed * 12;
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  context.arc(state.receiver.x * radius, state.receiver.y * radius, Math.max(5, radius * 0.023), 0, Math.PI * 2);
  context.fillStyle = '#b9ffe8';
  context.shadowColor = '#73f6cd';
  context.shadowBlur = 24;
  context.fill();

  context.strokeStyle = 'rgba(185,255,232,0.5)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(state.receiver.x * radius - 12, state.receiver.y * radius);
  context.lineTo(state.receiver.x * radius + 12, state.receiver.y * radius);
  context.moveTo(state.receiver.x * radius, state.receiver.y * radius - 12);
  context.lineTo(state.receiver.x * radius, state.receiver.y * radius + 12);
  context.stroke();

  context.globalAlpha = 0.7;
  glowLine(context, '#ff805c', 1.5);
  context.beginPath();
  context.moveTo(-radius * 0.77, -radius * 0.77);
  context.lineTo(-radius * 0.77 + state.disturbance.x * radius * 0.7, -radius * 0.77 + state.disturbance.y * radius * 0.7);
  context.stroke();
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.strokeStyle = 'rgba(141, 232, 207, 0.55)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, radius + 1, 0, Math.PI * 2);
  context.stroke();
  for (let tick = 0; tick < 48; tick += 1) {
    const angle = (tick / 48) * Math.PI * 2;
    const length = tick % 4 === 0 ? 10 : 5;
    context.beginPath();
    context.moveTo(Math.cos(angle) * (radius + 5), Math.sin(angle) * (radius + 5));
    context.lineTo(Math.cos(angle) * (radius + 5 + length), Math.sin(angle) * (radius + 5 + length));
    context.stroke();
  }
  context.restore();

  context.fillStyle = 'rgba(169, 231, 214, 0.55)';
  context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.textAlign = 'right';
  context.fillText(`D ${state.disturbance.x >= 0 ? '+' : ''}${state.disturbance.x.toFixed(2)} / ${state.disturbance.y >= 0 ? '+' : ''}${state.disturbance.y.toFixed(2)}`, width - 18, 24);
}
