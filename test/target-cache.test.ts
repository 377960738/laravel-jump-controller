import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TargetCache } from '../src/core/target-cache';

describe('TargetCache', () => {
  it('recomputes only one invalidated target in a large route document', async () => {
    const cache = new TargetCache<number>();
    let computations = 0;
    const resolveAll = (): Promise<number[]> => Promise.all(
      Array.from({ length: 150 }, (_, index) => cache.resolve(`method:${index}`, async () => {
        computations += 1;
        return index;
      })),
    );

    assert.equal((await resolveAll()).length, 150);
    assert.equal(computations, 150);
    cache.invalidate('method:73');
    assert.equal((await resolveAll())[73], 73);
    assert.equal(computations, 151);
  });

  it('does not let an older rejected computation evict its replacement', async () => {
    const cache = new TargetCache<number>();
    let rejectOld: ((error: Error) => void) | undefined;
    const old = cache.resolve('method:show', () => new Promise((_, reject) => { rejectOld = reject; }));
    cache.invalidate('method:show');
    const replacement = cache.resolve('method:show', async () => 2);
    rejectOld?.(new Error('cancelled'));
    await assert.rejects(old);
    assert.equal(await replacement, 2);
    assert.equal(await cache.resolve('method:show', async () => 3), 2);
  });
});
