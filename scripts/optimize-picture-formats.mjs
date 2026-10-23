import { resolve } from 'node:path';
import { optimizePictureFormats } from './lib/optimize-picture-formats.mjs';
const removed = await optimizePictureFormats(resolve('dist'));
console.log(`Picture formats: kept WebP where AVIF was not smaller at every responsive width (${removed} redundant sources removed).`);
