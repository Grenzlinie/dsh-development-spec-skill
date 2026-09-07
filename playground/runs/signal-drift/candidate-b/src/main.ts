import "./style.css";
import {
  createGame,
  getTelemetry,
  restartGame,
  setPaused,
  stepGame,
  togglePaused,
  type InputState,
} from "./core";
import { renderGame, resizeCanvas } from "./render";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>("#game");
const scoreOutput = requireElement<HTMLOutputElement>("#score");
const livesOutput = requireElement<HTMLOutputElement>("#lives");
const statusOutput = requireElement<HTMLOutputElement>("#status");
const dangerTrack = requireElement<HTMLElement>("#danger-track");
const dangerFill = requireElement<HTMLElement>("#danger-fill");
const pauseButton = requireElement<HTMLButtonElement>("#pause-button");
const restartButton = requireElement<HTMLButtonElement>("#restart-button");
const runtimeNote = requireElement<HTMLElement>("#runtime-note");

let state = createGame();
let held: InputState = { left: false, right: false };
let lastFrame: number | undefined;

function clearHeldInput(): void {
  held = { left: false, right: false };
}

function syncInterface(): void {
  const telemetry = getTelemetry(state);
  scoreOutput.value = String(telemetry.score).padStart(3, "0");
  livesOutput.value = [0, 1, 2]
    .map((index) => (index < telemetry.lives ? "●" : "○"))
    .join(" ");
  livesOutput.setAttribute("aria-label", `${telemetry.lives} lives remaining`);
  statusOutput.value = telemetry.statusLabel;
  statusOutput.dataset.state = telemetry.status;
  dangerFill.style.transform = `scaleX(${telemetry.outsideProgress})`;
  dangerTrack.setAttribute("aria-valuenow", String(Math.round(telemetry.outsideProgress * 750)));
  pauseButton.textContent = state.phase === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = state.phase === "game-over";
  runtimeNote.textContent =
    state.phase === "game-over"
      ? `Final score: ${state.score} · Enter or Restart`
      : `Disturbance pressure: ${telemetry.difficulty.toFixed(2)}×`;
}

function restart(): void {
  clearHeldInput();
  state = restartGame(state);
  lastFrame = undefined;
  syncInterface();
  renderGame(canvas, state);
}

function togglePause(): void {
  clearHeldInput();
  state = togglePaused(state);
  lastFrame = undefined;
  syncInterface();
  renderGame(canvas, state);
}

function directionalKey(key: string): keyof InputState | undefined {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") return "left";
  if (key === "ArrowRight" || key.toLowerCase() === "d") return "right";
  return undefined;
}

window.addEventListener("keydown", (event) => {
  const direction = directionalKey(event.key);
  if (direction) {
    event.preventDefault();
    if (state.phase === "playing") held = { ...held, [direction]: true };
    return;
  }

  if ((event.key.toLowerCase() === "p" || event.key === "Escape") && !event.repeat) {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key === "Enter" && state.phase === "game-over") {
    event.preventDefault();
    restart();
  }
});

window.addEventListener("keyup", (event) => {
  const direction = directionalKey(event.key);
  if (!direction) return;
  event.preventDefault();
  held = { ...held, [direction]: false };
});

window.addEventListener("blur", () => {
  clearHeldInput();
  state = setPaused(state, true);
  lastFrame = undefined;
  syncInterface();
  renderGame(canvas, state);
});

pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restart);

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas(canvas);
  renderGame(canvas, state);
});
resizeObserver.observe(canvas);

function frame(timestamp: number): void {
  if (lastFrame === undefined) lastFrame = timestamp;
  const dt = (timestamp - lastFrame) / 1000;
  lastFrame = timestamp;
  state = stepGame(state, held, dt);
  syncInterface();
  renderGame(canvas, state);
  requestAnimationFrame(frame);
}

syncInterface();
resizeCanvas(canvas);
renderGame(canvas, state);
requestAnimationFrame(frame);
