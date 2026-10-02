// W2-41 scratch: node --import ./importmap_register.mjs acceptance_check.mjs
import { register } from 'node:module';
register('./importmap_hooks.mjs', import.meta.url);
