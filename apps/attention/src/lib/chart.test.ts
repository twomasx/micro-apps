import { describe, expect, it } from 'vitest';
import { chartPoints, labelAbove, labelledIndexes, nearestIndex, scoreDomain, secondsDomain } from './chart';

const box = { width: 300, height: 200, padTop: 30, padBottom: 20, padX: 10 };

describe('chart geometry', () => {
  it('spreads points across the box and maps values to height', () => {
    const points = chartPoints([0, 50, 100], [0, 100], box);
    expect(points.map((p) => p.x)).toEqual([10, 150, 290]);
    expect(points.map((p) => p.y)).toEqual([180, 105, 30]);
  });

  it('centers a single point', () => {
    expect(chartPoints([5], [0, 10], box)[0]!.x).toBe(150);
  });

  it('keeps out-of-range values inside the box', () => {
    expect(chartPoints([200], [0, 100], box)[0]!.y).toBe(30);
  });

  it('frames scores in steps of 10 inside 0 to 100', () => {
    expect(scoreDomain([72, 78, 81])).toEqual([60, 100]);
    expect(scoreDomain([5])).toEqual([0, 20]);
    expect(scoreDomain([95, 99])).toEqual([80, 100]);
    expect(scoreDomain([])).toEqual([0, 100]);
  });

  it('starts durations at zero', () => {
    expect(secondsDomain([20, 45])).toEqual([0, 60]);
    expect(secondsDomain([])).toEqual([0, 20]);
  });

  it('labels only the first, the highest and the last value', () => {
    expect(labelledIndexes([3, 9, 4, 5])).toEqual([0, 1, 3]);
    expect(labelledIndexes([3, 4])).toEqual([0, 1]);
    expect(labelledIndexes([7])).toEqual([0]);
    expect(labelledIndexes([])).toEqual([]);
  });

  it('moves an end label below its point when the line rises away from it', () => {
    expect(labelAbove([25, 40, 83], 0)).toBe(false);
    expect(labelAbove([70, 60], 0)).toBe(true);
    expect(labelAbove([70, 80, 74], 2)).toBe(false);
    expect(labelAbove([70, 60, 90], 2)).toBe(true);
    expect(labelAbove([1, 9, 2], 1)).toBe(true);
  });

  it('finds the point nearest a pointer', () => {
    const points = chartPoints([1, 2, 3], [0, 3], box);
    expect(nearestIndex(points, 140)).toBe(1);
    expect(nearestIndex(points, 0)).toBe(0);
  });
});
