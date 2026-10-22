import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';

const script = await readFile(new URL('../public/admin/editor.js', import.meta.url), 'utf8');
const components = await readFile(new URL('../public/admin/components.js', import.meta.url), 'utf8');
function load(hostname) {
    let widget, config;
    let assetBoundary;
    const timers = [];
    const window = { createBlogMdxEditor: (_model, boundary) => { assetBoundary = boundary; return 'MdxVisual'; } };
    const previews = {};
    const events = {};
    const context = vm.createContext({
        location: { hostname },
        window,
        setTimeout: callback => { timers.push(callback); return timers.length; },
        clearTimeout: () => {},
        createClass: definition => definition,
        h: (type, props, ...children) => ({ type, props, children }),
        CMS: {
            getWidget: () => ({ control: 'MarkdownControl', preview: 'MarkdownPreview' }),
            registerWidget: (_name, control) => { widget = control; },
            registerPreviewTemplate: (name, preview) => { previews[name] = preview; },
            registerPreviewStyle: () => {},
            registerEventListener: event => { events[event.name] = event.handler; },
            init: value => { config = value; },
        },
    });
    vm.runInContext(components, context);
    vm.runInContext(script, context);
    window.initBlogEditor({});
    return { widget, config, previews, assetBoundary, timers, events };
}
test('CMS refuses to save encrypted content without a password and preserves valid data', () => {
    const { events } = load('www.etalib.space');
    for (const password of ['', '  ', undefined]) {
        const data = new Map([['encrypted', true], ['password', password]]);
        assert.throws(() => events.preSave({ entry: new Map([['data', data]]) }), /密码/);
    }
    const data = new Map([['encrypted', true], ['password', 'private']]);
    assert.equal(events.preSave({ entry: new Map([['data', data]]) }), data);
});
test('advanced article syntax locks source mode; ordinary text can switch modes', () => {
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

test('every new editor opens Markdown regardless of Decap browser preference', () => {
    const { widget } = load('www.etalib.space');
    const field = new Map([['modes', ['rich_text', 'raw']]]);
    field.set = function (key, value) { return Map.prototype.set.call(this, key, value); };
    const editor = { props: { value: '# Ordinary text', field }, componentForm: () => null };
    editor.state = widget.getInitialState.call(editor);
    assert.equal(editor.state.richText, false);
    let control = widget.render.call(editor).children.at(-1);
    assert.deepEqual(control.props.field.get('modes'), ['raw']);
    field.set('modes', ['rich_text', 'raw']);
    editor.state.richText = true;
    control = widget.render.call(editor).children.at(-1);
    assert.deepEqual(control.props.field.get('modes'), ['rich_text']);
    field.set('modes', ['rich_text', 'raw']);
    editor.props.value = ':::song{title="Keep source"}';
    assert.deepEqual(widget.render.call(editor).children.at(-1).props.field.get('modes'), ['raw']);
});

test('new article switches match site habits while existing article data is not rewritten', async () => {
    const config = yaml.load(await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));
    for (const name of ['posts', 'mdx']) {
        const fields = config.collections.find(collection => collection.name === name).fields;
        for (const key of ['comment', 'encrypted', 'coverInContent', 'pinned']) {
            assert.equal(fields.find(field => field.name === key).default, false, `${name}.${key}`);
        }
        assert.equal(fields.find(field => field.name === 'draft').default, true);
        const copy = fields.find(field => field.name === 'copyProtection');
        assert.equal(copy.collapsed, true);
        assert.ok(copy.fields.every(field => field.default === false));
    }
});

test('image previews bypass Decap widget memoization without changing article text', () => {
    const { previews } = load('www.etalib.space');
    for (const name of ['posts', 'mdx', 'about', 'links_intro']) {
        const body = '![](local.jpg)';
        const fields = [new Map([['name', 'body']]), new Map([['name', 'cover']])];
        let url = 'blob:placeholder';
        const props = { entry: new Map([['data', new Map([['body', body], ['cover', 'cover.png']])]]),
            fields, getAsset: () => url };
        const render = () => previews[name](props).props.render(props.getAsset);
        assert.equal(render().children.at(-2).props.src, 'blob:placeholder');
        url = 'blob:loaded';
        const ready = render();
        assert.equal(ready.children.at(-2).props.src, 'blob:loaded');
        assert.equal(ready.children.at(-1).type, 'MarkdownPreview');
        assert.equal(ready.children.at(-1).props.value, body);
    }
});

test('a cached placeholder is retried without typing or toggling the preview', () => {
    const { assetBoundary, timers } = load('www.etalib.space');
    let asset = { path: 'empty.svg' }, reads = 0;
    const boundary = { ...assetBoundary, props: { watchKey: 'post', getAsset: () => { reads++; return asset; }, render: getAsset => getAsset('photo.jpg') },
        setState(update) { this.state = { ...this.state, ...update }; } };
    boundary.state = boundary.getInitialState();
    boundary.getAsset = boundary.getAsset.bind(boundary);
    boundary.render(); boundary.componentDidMount();
    assert.equal(timers.length, 1);
    asset = { path: 'photo.jpg' };
    timers.shift()();
    boundary.render(); boundary.componentDidUpdate(boundary.props);
    assert.equal(reads, 2);
    assert.equal(boundary.pending, false);
    assert.equal(timers.length, 0);
    boundary.componentWillUnmount();
    assert.equal(boundary.mounted, false);
});

test('native image fields also retry assets requested in an effect after mount', () => {
    const { assetBoundary, timers } = load('www.etalib.space');
    const boundary = { ...assetBoundary, props: { getAsset: () => ({ path: 'empty.svg' }), render: () => null },
        setState() {} };
    boundary.getAsset = boundary.getAsset.bind(boundary);
    boundary.state = boundary.getInitialState();
    boundary.render(); boundary.componentDidMount();
    assert.equal(timers.length, 0);
    boundary.getAsset('cover.png');
    assert.equal(timers.length, 1);
    boundary.componentWillUnmount();
});
test('production editor does not enable the unauthenticated local proxy', () => {
    assert.equal(load('www.etalib.space').config.config?.local_backend, undefined);
    assert.equal(load('127.0.0.1').config.config.local_backend.url, 'http://127.0.0.1:8081/api/v1');
});
