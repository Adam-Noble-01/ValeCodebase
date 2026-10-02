// W2-05 scratch: register the gate simulation's hook (node --import ./register_gate.mjs gate_sim.mjs)
import { register } from 'node:module';
register('./hooks_gate.mjs', import.meta.url);
