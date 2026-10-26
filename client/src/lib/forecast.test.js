import { describe, expect, it } from 'vitest';
import { buildForecast, confidence, linearFit } from './forecast';

const Y = new Date().getFullYear();
const row = (key, employmentRate, extra = {}) => ({ key, total: 100, traced: 50, coverage: 50, laborForce: 40, employed: 30, alignedRate: 60, employmentRate, ...extra });
const targets = { employment: 80, coverage: 60 };

describe('linearFit', () => {
  it('fits a straight line exactly', () => {
    const f = linearFit([[1, 3], [2, 5], [3, 7]]);
    expect(f.slope).toBeCloseTo(2);
    expect(f.intercept).toBeCloseTo(1);
    expect(f.r2).toBeCloseTo(1);
    expect(f.at(4)).toBeCloseTo(9);
  });

  it('needs two distinct x values', () => {
    expect(linearFit([[1, 3]])).toBeNull();
    expect(linearFit([[1, 3], [1, 4]])).toBeNull();
  });
});

describe('confidence', () => {
  it('grades by batches and fit', () => {
    expect(confidence(null)).toBe('Low');
    expect(confidence({ n: 6, r2: 0.9 })).toBe('High');
    expect(confidence({ n: 4, r2: 0.5 })).toBe('Medium');
    expect(confidence({ n: 3, r2: 0.9 })).toBe('Low');
  });
});

describe('buildForecast', () => {
  it('projects the next batches and says when the target is reached', () => {
    const rows = [0, 1, 2, 3, 4].map((i) => row(Y - 6 + i, 60 + i * 4));
    const f = buildForecast(rows, targets);
    const emp = f.tiles.find((t) => t.id === 'emp');
    expect(emp.ready).toBe(true);
    expect(emp.value).toBe('80.0%');
    expect(emp.sub).toContain(`Batch ${Y - 1}`);
    expect(emp.trend).toBe('↑ 4.0 pts / batch');
    expect(f.chart.points.filter((p) => p.proj)).toHaveLength(3);
    expect(f.insights[0].lead).toBe('Employment rate on track to reach the 80% target');
    expect(f.insights[0].text).toContain(`batch ${Y - 1}`);
  });

  it('warns when a falling rate will cross below the target', () => {
    const rows = [0, 1, 2, 3].map((i) => row(Y - 4 + i, 95 - i * 4));
    const f = buildForecast(rows, targets);
    expect(f.insights[0].lead).toBe('Employment rate may fall below the 80% target');
  });

  it('keeps rates within 0–100%', () => {
    const rows = [0, 1, 2, 3].map((i) => row(Y - 4 + i, 70 + i * 10));
    const emp = buildForecast(rows, targets).tiles.find((t) => t.id === 'emp');
    expect(emp.value).toBe('100.0%');
  });

  it('skips batches without data and needs three of them', () => {
    const rows = [row(Y - 3, 70), row(Y - 2, 72, { laborForce: 0 }), row(Y - 1, 74)];
    const f = buildForecast(rows, targets);
    const emp = f.tiles.find((t) => t.id === 'emp');
    expect(emp.ready).toBe(false);
    expect(emp.sub).toContain('has 2');
    expect(f.chart).toBeNull();
  });

  it('explains when there is no history at all', () => {
    const f = buildForecast([], targets);
    expect(f.ready).toBe(false);
    expect(f.insights[0].lead).toBe('Not enough history to forecast yet.');
  });
});
