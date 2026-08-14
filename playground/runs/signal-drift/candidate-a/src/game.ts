export const FIXED_STEP = 1 / 120;
export const MAX_STEP = 0.1;
export const LOCK_RADIUS = 0.255;
export const FAILURE_TIME = 0.75;
export const DAMAGE_GRACE_TIME = 0.8;
export const MAX_LIVES = 3;

export interface Vector {
  x: number;
  y: number;
}

export interface Controls {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export type GameMode = 'running' | 'paused' | 'game-over';

export interface GameState {
  mode: GameMode;
  elapsed: number;
  score: number;
  scoreProgress: number;
  lives: number;
  offCourse: number;
  damageGrace: number;
  receiver: Vector;
  velocity: Vector;
  disturbance: Vector;
  disturbanceAge: number;
  disturbanceIndex: number;
  seed: number;
}

export const NO_CONTROLS: Controls = {
  left: false,
  right: false,
  up: false,
  down: false,
};

export function createGame(seed = 0x51a7d21): GameState {
  return {
    mode: 'running',
    elapsed: 0,
    score: 0,
    scoreProgress: 0,
    lives: MAX_LIVES,
    offCourse: 0,
    damageGrace: 0,
    receiver: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    disturbance: { x: 0.11, y: -0.04 },
    disturbanceAge: 0,
    disturbanceIndex: 0,
    seed: seed >>> 0,
  };
}

export function targetAt(elapsed: number): Vector {
  return {
    x: Math.sin(elapsed * 0.73) * 0.09 + Math.sin(elapsed * 0.19) * 0.045,
    y: Math.cos(elapsed * 0.59) * 0.07 + Math.sin(elapsed * 0.31) * 0.035,
  };
}

function randomUnit(seed: number): { value: number; seed: number } {
  let next = seed >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return { value: (next >>> 0) / 0xffffffff, seed: next >>> 0 };
}

function nextDisturbance(seed: number, index: number): { vector: Vector; seed: number } {
  const angleRoll = randomUnit(seed);
  const magnitudeRoll = randomUnit(angleRoll.seed);
  const angle = angleRoll.value * Math.PI * 2;
  const magnitude = 0.15 + magnitudeRoll.value * 0.13 + Math.min(index * 0.003, 0.06);
  return {
    vector: { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude },
    seed: magnitudeRoll.seed,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function signalDistance(state: GameState): number {
  const target = targetAt(state.elapsed);
  return Math.hypot(state.receiver.x - target.x, state.receiver.y - target.y);
}

/** Pure deterministic simulation. Browser timing and rendering never enter this function. */
export function stepGame(state: GameState, controls: Controls, dt = FIXED_STEP): GameState {
  if (state.mode !== 'running' || dt <= 0) return state;
  const step = Math.min(dt, MAX_STEP);

  let disturbance = state.disturbance;
  let disturbanceAge = state.disturbanceAge + step;
  let disturbanceIndex = state.disturbanceIndex;
  let seed = state.seed;

  if (disturbanceAge >= 1.1) {
    const generated = nextDisturbance(seed, disturbanceIndex);
    disturbance = generated.vector;
    seed = generated.seed;
    disturbanceAge %= 1.1;
    disturbanceIndex += 1;
  }

  const inputX = Number(controls.right) - Number(controls.left);
  const inputY = Number(controls.down) - Number(controls.up);
  const inputLength = Math.hypot(inputX, inputY) || 1;
  const acceleration = 0.92;
  const drag = Math.exp(-2.35 * step);
  const velocity = {
    x: (state.velocity.x + (inputX / inputLength) * acceleration * step + disturbance.x * step) * drag,
    y: (state.velocity.y + (inputY / inputLength) * acceleration * step + disturbance.y * step) * drag,
  };
  const receiver = {
    x: clamp(state.receiver.x + velocity.x * step, -0.92, 0.92),
    y: clamp(state.receiver.y + velocity.y * step, -0.92, 0.92),
  };

  const elapsed = state.elapsed + step;
  const target = targetAt(elapsed);
  const distance = Math.hypot(receiver.x - target.x, receiver.y - target.y);
  const locked = distance <= LOCK_RADIUS;
  const graceActive = state.damageGrace > 1e-9;
  let damageGrace = state.damageGrace <= step + 1e-9 ? 0 : state.damageGrace - step;
  let offCourse = graceActive
    ? 0
    : locked
      ? Math.max(0, state.offCourse - step * 1.8)
      : state.offCourse + step;
  let scoreProgress = state.scoreProgress + step;
  const earnedSeconds = Math.floor(scoreProgress + 1e-9);
  let score = state.score + earnedSeconds;
  scoreProgress -= earnedSeconds;
  let lives = state.lives;
  let mode: GameMode = state.mode;

  if (offCourse >= FAILURE_TIME) {
    lives -= 1;
    offCourse = 0;
    if (lives <= 0) {
      mode = 'game-over';
      damageGrace = 0;
    } else {
      damageGrace = DAMAGE_GRACE_TIME;
      receiver.x = target.x;
      receiver.y = target.y;
      velocity.x = 0;
      velocity.y = 0;
    }
  }

  return {
    mode,
    elapsed,
    score,
    scoreProgress,
    lives,
    offCourse,
    damageGrace,
    receiver,
    velocity,
    disturbance,
    disturbanceAge,
    disturbanceIndex,
    seed,
  };
}

export function togglePause(state: GameState): GameState {
  if (state.mode === 'game-over') return state;
  return { ...state, mode: state.mode === 'paused' ? 'running' : 'paused' };
}

export function runSteps(
  state: GameState,
  controls: Controls,
  count: number,
  dt = FIXED_STEP,
): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) next = stepGame(next, controls, dt);
  return next;
}
