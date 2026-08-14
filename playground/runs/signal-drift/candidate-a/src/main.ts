import './style.css';
import {
  FAILURE_TIME,
  FIXED_STEP,
  createGame,
  signalDistance,
  stepGame,
  togglePause,
  type Controls,
  type GameState,
} from './game';
import { renderGame } from './render';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Signal Drift UI is missing ${selector}.`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>('#game');
const scoreNode = requiredElement<HTMLElement>('#score');
const phaseNode = requiredElement<HTMLElement>('#phase');
const livesNode = requiredElement<HTMLElement>('#lives');
const integrityNode = requiredElement<HTMLElement>('#integrity-bar');
const statusNode = requiredElement<HTMLElement>('#status');
const overlay = requiredElement<HTMLElement>('#overlay');
const overlayKicker = requiredElement<HTMLElement>('#overlay-kicker');
const overlayTitle = requiredElement<HTMLElement>('#overlay-title');
const overlayCopy = requiredElement<HTMLElement>('#overlay-copy');
const pauseButton = requiredElement<HTMLButtonElement>('#pause-button');
const restartButton = requiredElement<HTMLButtonElement>('#restart-button');

function requiredContext(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const candidate = target.getContext('2d');
  if (!candidate) throw new Error('Canvas 2D is not supported.');
  return candidate;
}

const context = requiredContext(canvas);

let game = createGame();
const controls: Controls = { left: false, right: false, up: false, down: false };
let accumulator = 0;
let previousTime = performance.now();

const controlMap: Record<string, keyof Controls | undefined> = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
};

function resize(): void {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width * dpr));
  const height = Math.max(1, Math.round(bounds.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function restart(): void {
  game = createGame();
  Object.assign(controls, { left: false, right: false, up: false, down: false });
  accumulator = 0;
}

function setOverlay(state: GameState): void {
  const visible = state.mode !== 'running';
  overlay.hidden = !visible;
  if (state.mode === 'game-over') {
    overlayKicker.textContent = 'CARRIER LOST';
    overlayTitle.textContent = 'BLACKOUT';
    overlayCopy.textContent = 'Press Enter or use Restart to restore the array.';
  } else {
    overlayKicker.textContent = 'TRANSMISSION HELD';
    overlayTitle.textContent = 'PAUSED';
    overlayCopy.textContent = 'Press P, Escape, or Resume to return to the carrier.';
  }
}

function syncHud(state: GameState): void {
  scoreNode.textContent = state.score.toString().padStart(6, '0');
  phaseNode.textContent = state.damageGrace > 0 ? 'GRACE' : state.mode === 'running' ? 'ACTIVE' : state.mode === 'paused' ? 'HELD' : 'LOST';
  livesNode.textContent = `${'◆ '.repeat(state.lives)}${'◇ '.repeat(3 - state.lives)}`.trim();
  livesNode.setAttribute('aria-label', `${state.lives} receivers remaining`);
  const integrity = Math.max(0, 1 - state.offCourse / FAILURE_TIME);
  integrityNode.style.transform = `scaleX(${integrity})`;
  const distance = signalDistance(state);
  statusNode.textContent = state.damageGrace > 0 ? 'RECEIVER RECALIBRATING' : distance < 0.255 ? 'CARRIER LOCKED' : distance < 0.42 ? 'LOCK UNSTABLE' : 'SIGNAL BREAKING';
  statusNode.dataset.danger = state.damageGrace <= 0 && distance >= 0.255 ? 'true' : 'false';
  pauseButton.textContent = state.mode === 'paused' ? 'RESUME' : 'PAUSE';
  pauseButton.disabled = state.mode === 'game-over';
  setOverlay(state);
}

function onKey(event: KeyboardEvent, pressed: boolean): void {
  const mapped = controlMap[event.key];
  if (mapped) {
    controls[mapped] = pressed;
    event.preventDefault();
  }
  if (!pressed || event.repeat) return;
  if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    game = togglePause(game);
    accumulator = 0;
    event.preventDefault();
  }
  if (event.key === 'Enter' && game.mode === 'game-over') restart();
}

window.addEventListener('keydown', (event) => onKey(event, true));
window.addEventListener('keyup', (event) => onKey(event, false));
window.addEventListener('blur', () => {
  Object.assign(controls, { left: false, right: false, up: false, down: false });
  if (game.mode === 'running') game = togglePause(game);
  accumulator = 0;
});
window.addEventListener('resize', resize);
pauseButton.addEventListener('click', () => {
  game = togglePause(game);
  accumulator = 0;
});
restartButton.addEventListener('click', restart);

function frame(now: number): void {
  const frameTime = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  if (game.mode === 'running') {
    accumulator += frameTime;
    while (accumulator >= FIXED_STEP) {
      game = stepGame(game, controls);
      accumulator -= FIXED_STEP;
    }
  }
  resize();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderGame(context, game, { width: canvas.width / dpr, height: canvas.height / dpr });
  syncHud(game);
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);
