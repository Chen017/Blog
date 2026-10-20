import assert from 'node:assert/strict';
import test from 'node:test';
import { createRetryableLoader } from '../src/utils/lazy-resource.ts';

test('concurrent search opens share one in-flight resource and reuse success', async () => {
    let calls = 0;
    let complete;
    const loader = createRetryableLoader(() => {
        calls++;
        return new Promise(resolve => { complete = resolve; });
    });
    const first = loader();
    const second = loader();
    await Promise.resolve();
    assert.equal(calls, 1);
    complete('index');
    assert.deepEqual(await Promise.all([first, second, loader()]), ['index', 'index', 'index']);
    assert.equal(calls, 1);
});

test('a failed search download can be retried with a fresh attempt', async () => {
    const attempts = [];
    const loader = createRetryableLoader(async attempt => {
        attempts.push(attempt);
        if (attempt === 0) throw new Error('temporary network failure');
        return 'index';
    });
    await assert.rejects(loader(), /network failure/);
    assert.equal(await loader(), 'index');
    assert.deepEqual(attempts, [0, 1]);
});
