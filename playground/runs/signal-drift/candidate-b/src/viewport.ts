export interface CanvasMetrics {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
}

export function calculateCanvasMetrics(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): CanvasMetrics {
  const width = Math.max(1, Math.round(cssWidth));
  const height = Math.max(1, Math.round(cssHeight));
  const dpr = Math.min(3, Math.max(1, devicePixelRatio || 1));
  return {
    cssWidth: width,
    cssHeight: height,
    pixelWidth: Math.round(width * dpr),
    pixelHeight: Math.round(height * dpr),
    dpr,
  };
}
