import { describe, expect, it } from 'vitest';
import {
  DAMAGE_GRACE_TIME,
  FAILURE_TIME,
  LOCK_RADIUS,
  MAX_STEP,
  NO_CONTROLS,
  createGame,
  runSteps,
  signalDistance,
  stepGame,
  targetAt,
  togglePause,
} from '../src/game';

describe('deterministic game state', () => {
  it('replays identical input with identical results', () => {
    const controls = { left: false, right: true, up: true, down: false };
    expect(runSteps(createGame(42), controls, 500)).toEqual(runSteps(createGame(42), controls, 500));
  });

  it('uses the seed to produce repeatable but distinct disturbance fields', () => {
    const a = runSteps(createGame(1), NO_CONTROLS, 300);
    const b = runSteps(createGame(2), NO_CONTROLS, 300);
    expect(a.disturbanceIndex).toBeGreaterThan(0);
    expect(a.disturbance).not.toEqual(b.disturbance);
  });

  it('moves in response to correction controls', () => {
    const start = createGame();
    const corrected = runSteps(start, { ...NO_CONTROLS, right: true }, 30);
    expect(corrected.receiver.x).toBeGreaterThan(start.receiver.x);
    expect(corrected.velocity.x).toBeGreaterThan(0);
  });

  it('does not mutate the input state', () => {
    const start = createGame();
    const snapshot = structuredClone(start);
    stepGame(start, NO_CONTROLS);
    expect(start).toEqual(snapshot);
  });

  it('does not advance while paused', () => {
    const paused = togglePause(createGame());
    expect(stepGame(paused, { ...NO_CONTROLS, right: true }, 10)).toBe(paused);
    expect(togglePause(paused).mode).toBe('running');
  });

  it('awards exactly one point per survived active second', () => {
    const almostOneSecond = runSteps(createGame(), NO_CONTROLS, 119);
    expect(signalDistance(almostOneSecond)).toBeLessThan(LOCK_RADIUS);
    expect(almostOneSecond.score).toBe(0);
    expect(stepGame(almostOneSecond, NO_CONTROLS).score).toBe(1);
    expect(runSteps(createGame(), NO_CONTROLS, 240).score).toBe(2);
  });

  it('clamps an individual simulation step to 100ms', () => {
    const oversized = stepGame(createGame(), { ...NO_CONTROLS, right: true }, 4);
    const clamped = stepGame(createGame(), { ...NO_CONTROLS, right: true }, MAX_STEP);
    expect(oversized).toEqual(clamped);
    expect(oversized.elapsed).toBe(MAX_STEP);
  });

  it('loses a life after a sustained signal break and recenters', () => {
    const elapsed = 5;
    const target = targetAt(elapsed);
    const endangered = {
      ...createGame(),
      elapsed,
      receiver: { x: target.x + 0.8, y: target.y + 0.8 },
      offCourse: FAILURE_TIME - MAX_STEP / 2,
      velocity: { x: 0, y: 0 },
    };
    const next = stepGame(endangered, NO_CONTROLS, MAX_STEP);
    expect(next.lives).toBe(2);
    expect(next.offCourse).toBe(0);
    expect(next.damageGrace).toBe(DAMAGE_GRACE_TIME);
    expect(signalDistance(next)).toBeCloseTo(0, 5);
  });

  it('suppresses a new damage window for 800ms after damage', () => {
    const damaged = stepGame({
      ...createGame(),
      receiver: { x: 0.9, y: 0.9 },
      offCourse: FAILURE_TIME,
    }, NO_CONTROLS, MAX_STEP);
    const keptFarAway = { ...damaged, receiver: { x: 0.9, y: 0.9 } };
    const afterGrace = runSteps(keptFarAway, NO_CONTROLS, 8, MAX_STEP);
    expect(afterGrace.damageGrace).toBeCloseTo(0, 10);
    expect(afterGrace.offCourse).toBe(0);
    expect(afterGrace.lives).toBe(2);

    const firstVulnerableStep = stepGame(afterGrace, NO_CONTROLS, MAX_STEP);
    expect(firstVulnerableStep.offCourse).toBeCloseTo(MAX_STEP, 10);
    expect(firstVulnerableStep.lives).toBe(2);
  });

  it('ends the run after the final receiver is lost', () => {
    const doomed = {
      ...createGame(),
      lives: 1,
      receiver: { x: 0.9, y: 0.9 },
      offCourse: FAILURE_TIME,
    };
    const next = stepGame(doomed, NO_CONTROLS);
    expect(next.lives).toBe(0);
    expect(next.mode).toBe('game-over');
    expect(togglePause(next)).toBe(next);
  });
});
