import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';

test('CMS skill options cover every preserved personal skill without changing its data', async () => {
    const config = yaml.load(await readFile(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));
    const collection = config.collections.find(collection => collection.name === 'skills');
    const category = collection.fields.find(field => field.name === 'category').options;
    const level = collection.fields.find(field => field.name === 'level').options;
    const folder = new URL('../src/content/skills/', import.meta.url);
    const files = (await readdir(folder)).filter(file => file.endsWith('.json'));
    for (const file of files) {
        const skill = JSON.parse(await readFile(new URL(file, folder), 'utf8'));
        assert.ok(category.includes(skill.category), `${file}: missing category ${skill.category}`);
        assert.ok(level.includes(skill.level), `${file}: missing level ${skill.level}`);
    }
});
