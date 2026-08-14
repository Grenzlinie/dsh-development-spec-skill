import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createGame } from "../src/core";
import { calculateCanvasMetrics } from "../src/viewport";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(`${root}/${path}`, "utf8");

describe("accessible application shell", () => {
  const html = read("index.html");
  const adapter = read("src/main.ts");

  it("keeps instructions and live score/lives/status outside the canvas", () => {
    const canvasStart = html.indexOf("<canvas");
    const canvasEnd = html.indexOf("</canvas>");
    expect(html.indexOf('id="score"')).toBeLessThan(canvasStart);
    expect(html.indexOf('id="lives"')).toBeLessThan(canvasStart);
    expect(html.indexOf('id="status"')).toBeLessThan(canvasStart);
    expect(html.slice(canvasStart, canvasEnd)).not.toContain('id="score"');
    expect(html).toContain("KEEP THE MARKER IN THE SAFE BAND");
  });

  it("names the canvas and provides native pause and restart controls", () => {
    expect(html).toMatch(/<canvas[\s\S]*?aria-label="Signal alignment scope/);
    expect(html).toContain('<button id="pause-button" type="button">Pause</button>');
    expect(html).toContain('<button id="restart-button" type="button"');
  });

  it("wires required keys and focus-loss pausing in the browser adapter", () => {
    expect(adapter).toContain('key === "ArrowLeft"');
    expect(adapter).toContain('key === "ArrowRight"');
    expect(adapter).toContain('key.toLowerCase() === "a"');
    expect(adapter).toContain('key.toLowerCase() === "d"');
    expect(adapter).toContain('event.key.toLowerCase() === "p"');
    expect(adapter).toContain('event.key === "Escape"');
    expect(adapter).toContain('event.key === "Enter" && state.phase === "game-over"');
    expect(adapter).toContain('window.addEventListener("blur"');
  });
});

describe("core and viewport boundaries", () => {
  it("keeps the core free of DOM and wall-clock reads", () => {
    const core = read("src/core.ts");
    expect(core).not.toMatch(/\b(document|window|performance|Date\.now)\b/);
  });

  it("scales backing pixels without changing CSS or game coordinates", () => {
    const before = createGame(12);
    const snapshot = structuredClone(before);
    expect(calculateCanvasMetrics(390, 400, 2)).toEqual({
      cssWidth: 390,
      cssHeight: 400,
      pixelWidth: 780,
      pixelHeight: 800,
      dpr: 2,
    });
    expect(calculateCanvasMetrics(390, 400, 8).dpr).toBe(3);
    expect(before).toEqual(snapshot);
  });
});
