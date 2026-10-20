import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCandidateLaunchAgent } from '../src/v2/candidate_schedule.js';
test('candidate schedule escapes paths, disables immediate execution and contains no activation or credentials', () => {
  const xml = buildCandidateLaunchAgent({ projectDirectory: '/tmp/K & Stock', nodePath: '/usr/local/bin/node' });
  assert.match(xml, /K &amp; Stock/);
  assert.match(xml, /<string>--collect<\/string>/);
  assert.match(xml, /<key>RunAtLoad<\/key><false\/>/);
  assert.equal(xml.includes('KSTOCK_SEC_USER_AGENT'), false);
  assert.equal(xml.includes('KSTOCK_V2_SEC_ENABLED'), false);
  assert.throws(() => buildCandidateLaunchAgent({ projectDirectory: '/tmp', nodePath: '/bin/node', hour: 24 }), /Invalid/);
});
