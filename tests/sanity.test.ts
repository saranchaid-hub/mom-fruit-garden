import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs inside Node with no browser', () => {
    expect(1 + 1).toBe(2);
  });
});
