import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { getScrollBehavior } from '../src/utils/page-lifecycle.ts';

const source = (await readFile(new URL('../src/utils/panel-lifecycle.ts', import.meta.url), 'utf8'))
  .replace('"./page-lifecycle"', JSON.stringify(new URL('../src/utils/page-lifecycle.ts', import.meta.url).href));
const { bindPanelLifecycle } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);

test('scrolling respects reduced motion', () => {
  const original = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    assert.equal(getScrollBehavior(), 'instant');
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(getScrollBehavior(), 'smooth');
  } finally { globalThis.window = original; }
});

test('Escape restores trigger focus; navigation closes panels; cleanup removes listeners', () => {
  const original = globalThis.document;
  const document = new EventTarget();
  let focused = 0;
  document.getElementById = id => id === 'trigger' ? { focus() { focused++; } } : null;
  globalThis.document = document;
  let open = true;
  let closed = 0;
  const unbind = bindPanelLifecycle({ isOpen: () => open, close: () => { open = false; closed++; }, triggerId: 'trigger' });
  try {
    const escape = new Event('keydown', { cancelable: true });
    Object.defineProperty(escape, 'key', { value: 'Escape' });
    document.dispatchEvent(escape);
    assert.equal(open, false);
    assert.equal(focused, 1);
    assert.equal(escape.defaultPrevented, true);
    open = true;
    document.dispatchEvent(new Event('twilight:page:before-replace'));
    assert.equal(open, false);
    assert.equal(focused, 1);
    unbind();
    document.dispatchEvent(new Event('twilight:panels:close'));
    assert.equal(closed, 2);
  } finally {
    unbind();
    globalThis.document = original;
  }
});
