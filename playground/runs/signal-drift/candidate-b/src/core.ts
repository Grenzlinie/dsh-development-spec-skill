export const SAFE_BAND_HALF_WIDTH = 0.18;
export const OUTSIDE_LIMIT_SECONDS = 0.75;
export const GRACE_SECONDS = 0.8;
export const MAX_STEP_SECONDS = 0.1;
export const STARTING_LIVES = 3;
export const DEFAULT_SEED = 0x72e1a7;

export type GamePhase = "playing" | "paused" | "game-over";

export interface InputState {
  left: boolean;
  right: boolean;
}

export interface GameState {
  initialSeed: number;
  rng: number;
  position: number;
  velocity: number;
  disturbance: number;
  disturbanceIn: number;
  lives: number;
  score: number;
  activeSeconds: number;
  outsideSeconds: number;
  graceSeconds: number;
  phase: GamePhase;
  input: InputState;
}

export interface Telemetry {
  score: number;
  lives: number;
  status: "locked" | "drifting" | "recovery" | "paused" | "game-over";
  statusLabel: string;
  outsideProgress: number;
  difficulty: number;
}

const EMPTY_INPUT: InputState = Object.freeze({ left: false, right: false });

function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? seed >>> 0 : DEFAULT_SEED;
  return normalized === 0 ? DEFAULT_SEED : normalized;
}

function nextRandom(seed: number): { seed: number; value: number } {
  let next = seed >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return { seed: unsigned, value: unsigned / 0x1_0000_0000 };
}

export function getDifficulty(activeSeconds: number): number {
  return 1 + Math.min(Math.max(activeSeconds, 0) / 75, 1) * 1.35;
}

export function createGame(seed = DEFAULT_SEED): GameState {
  const initialSeed = normalizeSeed(seed);
  const firstNoise = nextRandom(initialSeed);

  return {
    initialSeed,
    rng: firstNoise.seed,
    position: 0,
    velocity: 0,
    disturbance: firstNoise.value * 2 - 1,
    disturbanceIn: 0.42,
    lives: STARTING_LIVES,
    score: 0,
    activeSeconds: 0,
    outsideSeconds: 0,
    graceSeconds: 0,
    phase: "playing",
    input: { ...EMPTY_INPUT },
  };
}

export function restartGame(state: GameState): GameState {
  return createGame(state.initialSeed);
}

export function setPaused(state: GameState, paused: boolean): GameState {
  if (state.phase === "game-over") return state;
  const nextPhase: GamePhase = paused ? "paused" : "playing";
  if (state.phase === nextPhase && !state.input.left && !state.input.right) return state;
  return { ...state, phase: nextPhase, input: { ...EMPTY_INPUT } };
}

export function togglePaused(state: GameState): GameState {
  if (state.phase === "game-over") return state;
  return setPaused(state, state.phase === "playing");
}

function clampStep(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt <= 0) return 0;
  return Math.min(rawDt, MAX_STEP_SECONDS);
}

function clampPosition(position: number, velocity: number): [number, number] {
  if (position > 1.08) return [1.08, Math.min(velocity, 0) * 0.35];
  if (position < -1.08) return [-1.08, Math.max(velocity, 0) * 0.35];
  return [position, velocity];
}

export function stepGame(state: GameState, input: InputState, rawDt: number): GameState {
  if (state.phase !== "playing") return state;

  const dt = clampStep(rawDt);
  if (dt === 0) return state;

  const controls = { left: Boolean(input.left), right: Boolean(input.right) };
  const activeSeconds = state.activeSeconds + dt;
  const score = Math.floor(activeSeconds + 1e-9);
  const difficulty = getDifficulty(activeSeconds);

  let rng = state.rng;
  let disturbance = state.disturbance;
  let disturbanceIn = state.disturbanceIn - dt;
  if (disturbanceIn <= 0) {
    const noise = nextRandom(rng);
    rng = noise.seed;
    disturbance = noise.value * 2 - 1;
    const interval = Math.max(0.24, 0.56 - activeSeconds * 0.0025);
    disturbanceIn += interval;
  }

  const controlAxis = Number(controls.right) - Number(controls.left);
  const acceleration = controlAxis * 2.15 + disturbance * 0.72 * difficulty;
  let velocity = (state.velocity + acceleration * dt) * Math.exp(-1.22 * dt);
  let position = state.position + velocity * dt;
  [position, velocity] = clampPosition(position, velocity);

  const priorGrace = state.graceSeconds;
  const graceSeconds = Math.max(0, priorGrace - dt);
  const eligibleOutsideDt = Math.max(0, dt - priorGrace);
  let outsideSeconds = priorGrace > 0 ? 0 : state.outsideSeconds;
  let lives = state.lives;
  let phase: GamePhase = state.phase;

  if (graceSeconds > 0) {
    outsideSeconds = 0;
  } else if (Math.abs(position) > SAFE_BAND_HALF_WIDTH) {
    outsideSeconds += eligibleOutsideDt;
    if (outsideSeconds + 1e-9 >= OUTSIDE_LIMIT_SECONDS) {
      lives -= 1;
      position = 0;
      velocity = 0;
      outsideSeconds = 0;
      if (lives === 0) {
        phase = "game-over";
      }
    }
  } else {
    outsideSeconds = 0;
  }

  return {
    ...state,
    rng,
    position,
    velocity,
    disturbance,
    disturbanceIn,
    lives,
    score,
    activeSeconds,
    outsideSeconds,
    graceSeconds:
      state.lives !== lives && lives > 0 ? GRACE_SECONDS : graceSeconds,
    phase,
    input: controls,
  };
}

export function getTelemetry(state: GameState): Telemetry {
  let status: Telemetry["status"];
  if (state.phase === "game-over") status = "game-over";
  else if (state.phase === "paused") status = "paused";
  else if (state.graceSeconds > 0) status = "recovery";
  else if (Math.abs(state.position) <= SAFE_BAND_HALF_WIDTH) status = "locked";
  else status = "drifting";

  const labels: Record<Telemetry["status"], string> = {
    locked: "CARRIER LOCKED",
    drifting: "DRIFT WARNING",
    recovery: "RECOVERY GRACE",
    paused: "FEED HOLD — PAUSED",
    "game-over": "SIGNAL LOST — GAME OVER",
  };

  return {
    score: state.score,
    lives: state.lives,
    status,
    statusLabel: labels[status],
    outsideProgress: Math.min(state.outsideSeconds / OUTSIDE_LIMIT_SECONDS, 1),
    difficulty: getDifficulty(state.activeSeconds),
  };
}
