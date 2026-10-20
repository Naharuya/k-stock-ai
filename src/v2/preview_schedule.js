import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCandidateLaunchAgent } from './candidate_schedule.js';
console.log(buildCandidateLaunchAgent({ projectDirectory: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), nodePath: process.execPath }));
