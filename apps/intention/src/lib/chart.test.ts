import { describe, expect, it } from 'vitest';
import { chartShape, chartVerdict, Z_100, Z_20 } from './chart.ts';

describe('the global chart', () => {
  it('draws the line from zero to the last point', () => {
    const shape = chartShape([0, 4000, 8000], [0, 100, 40], 400, 200);
    expect(shape.line.startsWith('M0 100 ')).toBe(true);
    expect(shape.end.x).toBe(400);
    expect(shape.zeroY).toBe(100);
    // +40 out of yMax, above the middle.
    expect(shape.end.y).toBeCloseTo(100 - (40 / shape.yMax) * 100, 6);
  });

  it('always leaves room for the outer band', () => {
    const shape = chartShape([0, 10_000], [0, 3], 400, 200);
    expect(shape.yMax).toBeGreaterThanOrEqual(Z_100 * Math.sqrt(10_000));
    const wild = chartShape([0, 100], [0, 90], 400, 200);
    expect(wild.yMax).toBeGreaterThanOrEqual(90);
  });

  it('bands are closed shapes that widen with √bits', () => {
    const shape = chartShape([0, 10_000], [0, 0], 400, 200);
    expect(shape.band20.startsWith('M0 100')).toBe(true);
    expect(shape.band20.endsWith('Z')).toBe(true);
    // At the right edge the inner band reaches 1.96 × 100 = 196 above zero.
    const top = 100 - ((Z_20 * 100) / shape.yMax) * 100;
    expect(shape.band20).toContain(`400 ${Math.round(top * 10) / 10}`);
  });

  it('works with no runs yet', () => {
    const shape = chartShape([0], [0], 400, 200);
    expect(shape.line).toBe('M0 100');
  });
});

describe('what the line says', () => {
  it('describes the line at the strength chance allows', () => {
    expect(chartVerdict(10_000, 150)).toBe('The line is inside the shaded area, where chance keeps it 19 times in 20.');
    expect(chartVerdict(10_000, -220)).toContain('below the inner band but inside the outer one');
    expect(chartVerdict(10_000, 300)).toContain('above both bands');
    expect(chartVerdict(0, 0)).toBe('');
  });
});
