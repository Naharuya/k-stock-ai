const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['android_external.test.js', 'external_access.test.js']);
const files = readdirSync(path.join(root, 'test')).filter(name => name.endsWith('.test.js') && !excluded.has(name)).sort().map(name => path.join(root, 'test', name));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: root });
process.exitCode = result.status ?? 1;
