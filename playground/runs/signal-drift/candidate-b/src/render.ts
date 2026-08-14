import {
  getTelemetry,
  SAFE_BAND_HALF_WIDTH,
  type GameState,
} from "./core";
import { calculateCanvasMetrics, type CanvasMetrics } from "./viewport";

const COLORS = {
  ink: "#8ef6c4",
  mint: "#45f0a1",
  amber: "#ffbf69",
  danger: "#ff5d73",
  panel: "#081a17",
  grid: "rgba(116, 229, 182, 0.12)",
};

export function resizeCanvas(canvas: HTMLCanvasElement): CanvasMetrics {
  const rect = canvas.getBoundingClientRect();
  const metrics = calculateCanvasMetrics(rect.width, rect.height, globalThis.devicePixelRatio);
  if (canvas.width !== metrics.pixelWidth || canvas.height !== metrics.pixelHeight) {
    canvas.width = metrics.pixelWidth;
    canvas.height = metrics.pixelHeight;
  }
  return metrics;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function renderGame(
  canvas: HTMLCanvasElement,
  state: GameState,
  metrics = resizeCanvas(canvas),
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = metrics.cssWidth;
  const height = metrics.cssHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const playWidth = width * 0.82;
  const left = (width - playWidth) / 2;

  context.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const background = context.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.7);
  background.addColorStop(0, "#0d2b24");
  background.addColorStop(0.65, "#071a17");
  background.addColorStop(1, "#040b0a");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = COLORS.grid;
  for (let index = 0; index <= 10; index += 1) {
    const x = left + (playWidth / 10) * index;
    context.beginPath();
    context.moveTo(x, height * 0.1);
    context.lineTo(x, height * 0.9);
    context.stroke();
  }
  for (let index = 1; index < 6; index += 1) {
    const y = height * 0.1 + (height * 0.8 * index) / 6;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + playWidth, y);
    context.stroke();
  }

  const bandWidth = (playWidth / 2) * SAFE_BAND_HALF_WIDTH;
  const bandGradient = context.createLinearGradient(centerX - bandWidth, 0, centerX + bandWidth, 0);
  bandGradient.addColorStop(0, "rgba(69, 240, 161, 0.05)");
  bandGradient.addColorStop(0.5, "rgba(69, 240, 161, 0.2)");
  bandGradient.addColorStop(1, "rgba(69, 240, 161, 0.05)");
  context.fillStyle = bandGradient;
  context.fillRect(centerX - bandWidth, height * 0.08, bandWidth * 2, height * 0.84);
  context.strokeStyle = "rgba(69, 240, 161, 0.62)";
  context.setLineDash([5, 7]);
  context.strokeRect(centerX - bandWidth, height * 0.08, bandWidth * 2, height * 0.84);
  context.setLineDash([]);

  context.strokeStyle = "rgba(142, 246, 196, 0.42)";
  context.lineWidth = 1.5;
  context.beginPath();
  for (let point = 0; point <= 160; point += 1) {
    const progress = point / 160;
    const x = left + progress * playWidth;
    const harmonic =
      Math.sin(progress * Math.PI * 8 + state.activeSeconds * 2.4) * 0.45 +
      Math.sin(progress * Math.PI * 22 - state.activeSeconds * 1.1) * 0.13;
    const y = centerY + harmonic * height * 0.18;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();

  const telemetry = getTelemetry(state);
  const markerX = centerX + state.position * (playWidth / 2);
  const markerColor =
    telemetry.status === "drifting" || telemetry.status === "game-over"
      ? COLORS.danger
      : telemetry.status === "recovery"
        ? COLORS.amber
        : COLORS.mint;

  context.save();
  context.shadowColor = markerColor;
  context.shadowBlur = 24;
  context.strokeStyle = markerColor;
  context.fillStyle = markerColor;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(markerX, centerY, Math.max(11, width * 0.018), 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(markerX, centerY - height * 0.16);
  context.lineTo(markerX, centerY + height * 0.16);
  context.stroke();
  context.beginPath();
  context.moveTo(markerX - 7, centerY);
  context.lineTo(markerX + 7, centerY);
  context.stroke();
  context.restore();

  context.font = `600 ${Math.max(10, Math.min(13, width * 0.025))}px "IBM Plex Mono", monospace`;
  context.textAlign = "center";
  context.fillStyle = "rgba(142, 246, 196, 0.76)";
  context.fillText("CARRIER ZERO", centerX, height * 0.145);

  if (state.phase === "paused" || state.phase === "game-over") {
    context.fillStyle = "rgba(3, 10, 9, 0.76)";
    context.fillRect(0, 0, width, height);
    const boxWidth = Math.min(360, width * 0.78);
    const boxHeight = Math.min(124, height * 0.46);
    roundedRect(context, centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight, 4);
    context.fillStyle = COLORS.panel;
    context.fill();
    context.strokeStyle = state.phase === "paused" ? COLORS.amber : COLORS.danger;
    context.stroke();
    context.fillStyle = state.phase === "paused" ? COLORS.amber : COLORS.danger;
    context.font = `700 ${Math.max(18, Math.min(28, width * 0.055))}px "Space Grotesk", sans-serif`;
    context.fillText(state.phase === "paused" ? "FEED PAUSED" : "SIGNAL LOST", centerX, centerY - 6);
    context.fillStyle = COLORS.ink;
    context.font = `500 ${Math.max(10, Math.min(13, width * 0.026))}px "IBM Plex Mono", monospace`;
    context.fillText(
      state.phase === "paused" ? "P / ESC OR RESUME CONTROL" : "PRESS ENTER OR RESTART",
      centerX,
      centerY + 25,
    );
  }
}
