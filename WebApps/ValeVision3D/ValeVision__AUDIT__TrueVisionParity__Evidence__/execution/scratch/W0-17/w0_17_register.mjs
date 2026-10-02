// W0-17 scratch - registers the import-map resolve hook (node --import ./w0_17_register.mjs ...)
import { register } from 'node:module';
register('./w0_17_loader.mjs', import.meta.url);
