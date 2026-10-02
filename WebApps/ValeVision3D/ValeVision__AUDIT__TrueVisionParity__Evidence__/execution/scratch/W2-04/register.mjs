// W2-40 scratch: register the import-map resolve hook (node --import ./register.mjs ...)
import { register } from 'node:module';
register('./importmap_hooks.mjs', import.meta.url);
