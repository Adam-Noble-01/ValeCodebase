// W2-05 scratch: register the import-map + redirect hook (node --import ./register_w205.mjs ...)
import { register } from 'node:module';
register('./hooks_w205.mjs', import.meta.url);
