import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const script = await readFile(new URL('../public/admin/editor.js', import.meta.url), 'utf8');
const components = await readFile(new URL('../public/admin/components.js', import.meta.url), 'utf8');
function load(hostname) {
    let widget, config;
    const context = vm.createContext({
        location: { hostname },
        createClass: definition => definition,
        h: () => {},
        CMS: {
            getWidget: () => ({}),
            registerWidget: (_name, control) => { widget = control; },
            init: value => { config = value; },
        },
    });
    vm.runInContext(components, context);
    vm.runInContext(script, context);
    return { widget, config };
}
test('advanced article syntax always opens in source mode; ordinary text stays rich', () => {
    const { widget } = load('www.etalib.space');
    const source = (value, force = false) => widget.getInitialState.call({
        props: { value, field: { get: key => key === 'force_raw' && force } },
    }).source;
    for (const value of [
        ':::song{title="Song"}', ':spoiler[hidden]',
        'import Photo from "./photo.png";', '<Card title="Hi" />',
        '$$\nx^2 + y^2\n$$', 'The equation $x^2$ works.',
        '~~~mermaid\ngraph TD\n A-->B\n~~~', '```mermaid\ngraph TD\n```',
        '> [!NOTE]\n> Hello',
    ]) assert.equal(source(value), true, value);
    assert.equal(source('# Ordinary article\n\nHello **world**!\n\n![Photo](photo.png)'), false);
    assert.equal(source('Plain MDX body', true), true);
});
test('production editor does not enable the unauthenticated local proxy', () => {
    assert.equal(load('www.etalib.space').config.config?.local_backend, undefined);
    assert.equal(load('127.0.0.1').config.config.local_backend.url, 'http://127.0.0.1:8081/api/v1');
});
