import { describe, expect, it } from "vitest";
import {
  createGame,
  getDifficulty,
  getTelemetry,
  GRACE_SECONDS,
  restartGame,
  setPaused,
  stepGame,
  togglePaused,
  type GameState,
  type InputState,
} from "../src/core";

const neutral: InputState = { left: false, right: false };

function advance(
  initial: GameState,
  steps: number,
  dt: number,
  input: InputState = neutral,
): GameState {
  let state = initial;
  for (let index = 0; index < steps; index += 1) state = stepGame(state, input, dt);
  return state;
}

function quietOutside(state = createGame(11)): GameState {
  return {
    ...state,
    position: 0.42,
    velocity: 0,
    disturbance: 0,
    disturbanceIn: 10,
  };
}

describe("deterministic game core", () => {
  it("starts an active run with three lives, zero score, and cleared input", () => {
    const state = createGame(19);
    expect(state).toMatchObject({
      position: 0,
      lives: 3,
      score: 0,
      activeSeconds: 0,
      outsideSeconds: 0,
      graceSeconds: 0,
      phase: "playing",
      input: neutral,
    });
  });

  it("uses left/right input on a horizontal-only state", () => {
    const start = createGame(22);
    const left = advance(start, 6, 0.05, { left: true, right: false });
    const right = advance(start, 6, 0.05, { left: false, right: true });
    expect(left.position).toBeLessThan(right.position);
    expect(left).not.toHaveProperty("y");
    expect(left).not.toHaveProperty("verticalVelocity");
  });

  it("replays an equal seed, input, and dt sequence exactly", () => {
    const sequence = [
      [{ left: false, right: true }, 0.016],
      [{ left: false, right: true }, 0.1],
      [{ left: true, right: false }, 0.037],
      [neutral, 0.099],
      [neutral, 0.041],
    ] as const;
    const replay = (): GameState =>
      sequence.reduce<GameState>(
        (state, [input, dt]) => stepGame(state, input, dt),
        createGame(0xabc123),
      );
    expect(replay()).toEqual(replay());
  });

  it("caps each explicit dt at 100ms", () => {
    const start = createGame(31);
    expect(stepGame(start, neutral, 9)).toEqual(stepGame(start, neutral, 0.1));
  });
});

describe("survival rules", () => {
  it("costs no life at 749ms outside and exactly one at 750ms", () => {
    let state = advance(quietOutside(), 7, 0.1);
    state = stepGame(state, neutral, 0.049);
    expect(state.outsideSeconds).toBeCloseTo(0.749, 8);
    expect(state.lives).toBe(3);

    state = stepGame(state, neutral, 0.001);
    expect(state.lives).toBe(2);
    expect(state.position).toBe(0);
    expect(state.outsideSeconds).toBe(0);
    expect(state.graceSeconds).toBe(GRACE_SECONDS);
  });

  it("resets exposure on re-entry and protects the full 800ms grace", () => {
    let state = advance(quietOutside(), 6, 0.1);
    state = stepGame({ ...state, position: 0 }, neutral, 0.05);
    expect(state.outsideSeconds).toBe(0);

    state = stepGame({ ...state, position: 0.42, outsideSeconds: 0.74 }, neutral, 0.01);
    expect(state.lives).toBe(2);
    expect(state.graceSeconds).toBe(0.8);

    state = { ...state, position: 0.42, disturbance: 0, disturbanceIn: 10 };
    state = advance(state, 8, 0.1);
    expect(state.lives).toBe(2);
    expect(state.graceSeconds).toBeCloseTo(0, 8);
    expect(state.outsideSeconds).toBeCloseTo(0, 8);

    state = stepGame(state, neutral, 0.1);
    expect(state.lives).toBe(2);
    expect(state.outsideSeconds).toBeCloseTo(0.1, 8);
  });

  it("scores one point per active second inside or outside the band", () => {
    const inside = advance(createGame(8), 10, 0.1);
    const outside = advance(quietOutside(createGame(8)), 10, 0.1);
    expect(inside.score).toBe(1);
    expect(outside.score).toBe(1);
  });

  it("freezes all simulation state while paused and after game over", () => {
    const paused = setPaused(advance(createGame(4), 3, 0.1), true);
    expect(stepGame(paused, { left: false, right: true }, 0.1)).toBe(paused);

    const nearlyLost = { ...quietOutside(createGame(4)), lives: 1, outsideSeconds: 0.74 };
    const gameOver = stepGame(nearlyLost, neutral, 0.01);
    expect(gameOver.phase).toBe("game-over");
    expect(stepGame(gameOver, { left: true, right: false }, 0.1)).toBe(gameOver);
  });
});

describe("pause, restart, and telemetry", () => {
  it("toggles pause and clears held input", () => {
    const moving = stepGame(createGame(71), { left: true, right: false }, 0.1);
    const paused = togglePaused(moving);
    expect(paused.phase).toBe("paused");
    expect(paused.input).toEqual(neutral);
    expect(togglePaused(paused).phase).toBe("playing");
  });

  it("restarts into the same clean deterministic initial state", () => {
    const dirty: GameState = {
      ...createGame(91),
      position: 0.8,
      velocity: 2,
      lives: 0,
      score: 42,
      activeSeconds: 42.7,
      outsideSeconds: 0.7,
      graceSeconds: 0.3,
      phase: "game-over",
      input: { left: true, right: true },
    };
    expect(restartGame(dirty)).toEqual(createGame(91));
  });

  it("exposes visible state meanings and gradually increasing difficulty", () => {
    expect(getTelemetry(createGame()).statusLabel).toBe("CARRIER LOCKED");
    expect(getTelemetry(setPaused(createGame(), true)).statusLabel).toContain("PAUSED");
    expect(getDifficulty(40)).toBeGreaterThan(getDifficulty(1));
    expect(getDifficulty(200)).toBe(getDifficulty(75));
  });
});
