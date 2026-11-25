/** Pure helpers for scroll-driven motion (kept separate so they can be unit-tested). */

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/**
 * How far a tall "scroll scene" has been scrolled through: 0 when its top reaches the top of the
 * viewport, 1 when its bottom reaches the bottom.
 */
export function sceneProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
): number {
  const travel = rect.height - viewportHeight;
  if (travel <= 0) return rect.top <= 0 ? 1 : 0;
  return clamp(-rect.top / travel);
}

export interface BallPose {
  /** Horizontal position of the ball's center, in px from the track start. */
  x: number;
  /** Vertical lift in px (negative = up): the ball hops between stops. */
  y: number;
  /** Rotation in degrees — exactly what a ball of this radius rolling `x` px would turn. */
  rotate: number;
  /** Squash on landing (1 = round). */
  scaleX: number;
  scaleY: number;
  /** Index of the last stop the ball has reached. */
  active: number;
  /** 0…1 for each stop: how "lit" it is (1 once the ball has reached it). */
  lit: number[];
}

/**
 * Rolling-ball physics for the "How it works" scene. The ball rolls along a track of `width` px
 * with `stops` evenly spaced stations, hopping in an arc between them and squashing as it lands.
 */
export function ballPose(
  progress: number,
  width: number,
  radius: number,
  stops: number,
  hop = 28,
): BallPose {
  const p = clamp(progress);
  const x = p * width;
  const segments = stops - 1;
  const along = p * segments; // 0…segments
  const segment = Math.min(Math.floor(along), segments - 1);
  const t = along - segment; // 0…1 within the current segment
  const y = -Math.sin(t * Math.PI) * hop;
  // Squash in the last/first 12% of each hop (landing and take-off), never at the very ends.
  const edge = Math.min(t, 1 - t);
  const squash = p > 0 && p < 1 && edge < 0.12 ? (0.12 - edge) / 0.12 : 0;
  const lit = Array.from({ length: stops }, (_, i) => clamp((along - i + 0.15) / 0.15));
  return {
    x,
    y,
    rotate: (x / radius) * (180 / Math.PI),
    scaleX: 1 + squash * 0.12,
    scaleY: 1 - squash * 0.12,
    active: Math.min(segments, Math.floor(along + 1e-6)),
    lit,
  };
}
