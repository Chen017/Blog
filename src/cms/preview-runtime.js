import katexStyle from 'katex/dist/katex.min.css?inline';
import * as model from './preview-model.js';
import { createMermaidRenderer } from './mermaid-preview.js';

export { katexStyle };
export const preview = { ...model, renderMermaid: createMermaidRenderer() };
