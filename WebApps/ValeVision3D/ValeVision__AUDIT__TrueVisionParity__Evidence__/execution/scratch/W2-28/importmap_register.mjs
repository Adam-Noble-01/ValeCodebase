// W2-28 scratch: node --import ./importmap_register.mjs acceptance_check.mjs
import { register } from 'node:module';
register('./importmap_hooks.mjs', import.meta.url);
