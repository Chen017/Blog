import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(await readFile(new URL('../src/utils/scroll-controls.ts', import.meta.url), 'utf8'))
    .replaceAll('export function', 'function');

function controls() {
    const frames = [];
    const listeners = new Map();
    const operations = [];
    let scrollTop = 0;
    const classes = () => {
        const values = new Set();
        return {
            contains: name => values.has(name),
            toggle(name, enabled) {
                operations.push(`write:${name}`);
                if (enabled) values.add(name); else values.delete(name);
            },
        };
    };
    const navbar = { dataset: { transparentMode: 'semifull' }, classList: classes() };
    const button = { classList: classes(), inert: false };
    const context = vm.createContext({
        requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
        document: { getElementById: id => id === 'navbar' ? navbar : button },
        window: {
            get scrollY() { operations.push('read:scroll'); return scrollTop; },
            get innerHeight() { operations.push('read:height'); return 800; },
            addEventListener(name, callback) {
                const callbacks = listeners.get(name) || [];
                callbacks.push(callback);
                listeners.set(name, callbacks);
            },
        },
    });
    vm.runInContext(source, context);
    return { context, frames, listeners, operations, navbar, button,
        scrollTo: top => { scrollTop = top; }, flush: () => frames.shift()() };
}

test('initialization and event bursts share one frame and read geometry before writes', () => {
    const state = controls();
    state.context.initScrollControls();
    state.context.initScrollControls();
    state.listeners.get('scroll')[0]();
    state.listeners.get('resize')[0]();
    assert.equal(state.listeners.get('scroll').length, 1);
    assert.equal(state.listeners.get('resize').length, 1);
    assert.equal(state.frames.length, 1);
    state.scrollTo(650);
    state.flush();
    assert.deepEqual(state.operations, ['read:scroll', 'read:height', 'write:scrolled', 'write:hide']);
    assert.equal(state.navbar.classList.contains('scrolled'), true);
    assert.equal(state.button.classList.contains('hide'), false);
    assert.equal(state.button.inert, false);
});

test('wallpaper changes clear the old navbar state and restored pages refresh controls', () => {
    const state = controls();
    state.scrollTo(650);
    state.context.initScrollControls();
    state.flush();
    state.navbar.dataset.transparentMode = 'full';
    state.context.scheduleScrollControls();
    state.flush();
    assert.equal(state.navbar.classList.contains('scrolled'), false);
    state.scrollTo(0);
    state.context.initScrollControls();
    state.flush();
    assert.equal(state.button.classList.contains('hide'), true);
    assert.equal(state.button.inert, true);
    assert.equal(state.listeners.get('scroll').length, 1);
});
