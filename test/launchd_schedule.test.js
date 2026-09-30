import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApiLaunchAgent, buildWatchlistLaunchAgent } from '../src/services/launchd_schedule.js';

test('LaunchAgent runs sequential local analysis weekdays after close without run-at-load or keepalive', () => {
  const plist = buildWatchlistLaunchAgent({
    projectDirectory: '/Users/ari/K-Stock & Research',
    nodePath: '/opt/homebrew/bin/node',
  });

  assert.match(plist, /<string>\/Users\/ari\/K-Stock &amp; Research<\/string>/);
  assert.match(plist, /<string>\/opt\/homebrew\/bin\/node<\/string>/);
  assert.match(plist, /<key>KSTOCK_AI_MODE<\/key>\s*<string>local<\/string>/);
  assert.match(plist, /<key>KSTOCK_LIVE_TRADING_ENABLED<\/key>\s*<string>false<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<false\/>/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<false\/>/);
  assert.match(plist, /<key>Weekday<\/key>\s*<integer>1<\/integer>\s*<key>Hour<\/key>\s*<integer>17<\/integer>\s*<key>Minute<\/key>\s*<integer>30<\/integer>/);
  assert.match(plist, /<key>Weekday<\/key>\s*<integer>5<\/integer>\s*<key>Hour<\/key>/);
  assert.doesNotMatch(plist, /KIS_APP_SECRET|OPENDART_API_KEY|OPENAI_API_KEY/);
});

test('LaunchAgent schedule validates time and weekday bounds', () => {
  assert.throws(
    () => buildWatchlistLaunchAgent({ projectDirectory: '/tmp/app', nodePath: '/usr/bin/node', hour: 24 }),
    /hour must be between 0 and 23/,
  );
  assert.throws(
    () => buildWatchlistLaunchAgent({ projectDirectory: '/tmp/app', nodePath: '/usr/bin/node', weekdays: [0] }),
    /weekdays must contain launchd weekday numbers/,
  );
});

test('API LaunchAgent starts on login, restarts on failure, and binds loopback only', () => {
  const plist = buildApiLaunchAgent({
    projectDirectory: '/Users/ari/K-Stock & Research',
    nodePath: '/opt/homebrew/bin/node',
  });
  assert.match(plist, /<string>com\.k-stock-ai\.api<\/string>/);
  assert.match(plist, /<key>HOST<\/key>\s*<string>127\.0\.0\.1<\/string>/);
  assert.match(plist, /<key>PORT<\/key>\s*<string>3002<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /<key>KSTOCK_LIVE_TRADING_ENABLED<\/key>\s*<string>false<\/string>/);
  assert.doesNotMatch(plist, /KIS_APP_SECRET|OPENDART_API_KEY|OPENAI_API_KEY/);
});

test('API LaunchAgent validates its port', () => {
  assert.throws(
    () => buildApiLaunchAgent({ projectDirectory: '/tmp/app', nodePath: '/usr/bin/node', port: 80 }),
    /port must be between 1024 and 65535/,
  );
});