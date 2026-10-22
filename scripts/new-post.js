import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

export function createPost(name, root = process.cwd(), today = new Date()) {
    const extension = /\.mdx$/i.test(name) ? 'mdx' : 'md';
    const slug = name.replace(/\.(?:md|mdx)$/i, '').replace(/\\/g, '/');
    if (!slug || path.posix.isAbsolute(slug) || slug.split('/').some(part => !part || part === '.' || part === '..') || /[<>:"|?*\u0000-\u001f]/.test(slug)) {
        throw new Error('Use a relative post slug without reserved filename characters.');
    }
    const file = path.resolve(root, 'src/content/posts', slug, `index.${extension}`);
    const base = path.resolve(root, 'src/content/posts') + path.sep;
    if (!file.startsWith(base)) throw new Error('Post path must stay inside src/content/posts.');
    if (fs.existsSync(file) || fs.existsSync(file.replace(/\.mdx?$/, extension === 'md' ? '.mdx' : '.md'))) {
        throw new Error('This post already exists.');
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const content = { title: path.posix.basename(slug), published: date, description: '', cover: '',
        category: '', draft: true, lang: '', comment: false, encrypted: false, coverInContent: false, pinned: false };
    fs.writeFileSync(file, `---\n${yaml.dump(content, { lineWidth: -1 })}---\n\n`, { flag: 'wx' });
    return file;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        if (!process.argv[2]) throw new Error('Usage: pnpm new-post <slug[.md|.mdx]>');
        console.log(`Draft created: ${createPost(process.argv[2])}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
