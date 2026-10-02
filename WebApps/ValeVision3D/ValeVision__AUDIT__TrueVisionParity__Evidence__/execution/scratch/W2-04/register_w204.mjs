// W2-04 scratch: register the import-map + redirect hook (node --import ./register_w204.mjs ...)
import { register } from 'node:module';
register('./hooks_w204.mjs', import.meta.url);
