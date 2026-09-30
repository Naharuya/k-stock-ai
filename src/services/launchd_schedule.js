import path from 'node:path';

const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function plistString(value) {
  return `<string>${xmlEscape(value)}</string>`;
}

export function buildWatchlistLaunchAgent({
  projectDirectory,
  nodePath,
  weekdays = DEFAULT_WEEKDAYS,
  hour = 17,
  minute = 30,
} = {}) {
  if (!projectDirectory || !nodePath) throw new TypeError('projectDirectory and nodePath are required');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new TypeError('hour must be between 0 and 23');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new TypeError('minute must be between 0 and 59');
  if (!Array.isArray(weekdays) || weekdays.length === 0 || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new TypeError('weekdays must contain launchd weekday numbers from 1 to 7');
  }

  const workingDirectory = path.resolve(projectDirectory);
  const nodeExecutable = path.resolve(nodePath);
  const runnerPath = path.join(workingDirectory, 'src', 'run_watchlist.js');
  const reportDirectory = path.join(workingDirectory, 'data', 'reports');
  const calendar = weekdays.map((weekday) => `
		<dict>
			<key>Weekday</key>
			<integer>${weekday}</integer>
			<key>Hour</key>
			<integer>${hour}</integer>
			<key>Minute</key>
			<integer>${minute}</integer>
		</dict>`).join('');
  const environment = {
    KSTOCK_AI_MODE: 'local',
    KSTOCK_LOCAL_BASE_URL: 'http://127.0.0.1:11434',
    KSTOCK_LOCAL_MODEL: process.env.KSTOCK_LOCAL_MODEL || 'qwen3:8b',
    KSTOCK_LOCAL_TIMEOUT_MS: process.env.KSTOCK_LOCAL_TIMEOUT_MS || '120000',
    KSTOCK_LOCAL_MAX_OUTPUT_TOKENS: process.env.KSTOCK_LOCAL_MAX_OUTPUT_TOKENS || '512',
    KSTOCK_KIS_ENABLED: 'true',
    KSTOCK_DART_ENABLED: 'true',
    KSTOCK_BROKER_ENABLED: 'false',
    KSTOCK_LIVE_TRADING_ENABLED: 'false',
    KSTOCK_WATCHLIST_PATH: path.join(workingDirectory, 'data', 'watchlist.json'),
    KSTOCK_REPORT_DIR: reportDirectory,
  };
  const environmentXml = Object.entries(environment).map(([key, value]) => `
		<key>${xmlEscape(key)}</key>
		${plistString(value)}`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	${plistString('com.k-stock-ai.watchlist')}
	<key>ProgramArguments</key>
	<array>
		${plistString(nodeExecutable)}
		${plistString(runnerPath)}
	</array>
	<key>WorkingDirectory</key>
	${plistString(workingDirectory)}
	<key>EnvironmentVariables</key>
	<dict>${environmentXml}
	</dict>
	<key>StartCalendarInterval</key>
	<array>${calendar}
	</array>
	<key>StandardOutPath</key>
	${plistString(path.join(reportDirectory, 'launchd.log'))}
	<key>StandardErrorPath</key>
	${plistString(path.join(reportDirectory, 'launchd.log'))}
	<key>ProcessType</key>
	${plistString('Background')}
	<key>RunAtLoad</key>
	<false/>
	<key>KeepAlive</key>
	<false/>
</dict>
</plist>
`;
}

export function buildApiLaunchAgent({ projectDirectory, nodePath, port = 3002 } = {}) {
  if (!projectDirectory || !nodePath) throw new TypeError('projectDirectory and nodePath are required');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new TypeError('port must be between 1024 and 65535');
  }

  const workingDirectory = path.resolve(projectDirectory);
  const nodeExecutable = path.resolve(nodePath);
  const serverPath = path.join(workingDirectory, 'src', 'server.js');
  const reportDirectory = path.join(workingDirectory, 'data', 'reports');
  const environment = {
    HOST: '127.0.0.1',
    PORT: String(port),
    KSTOCK_AI_MODE: 'local',
    KSTOCK_KIS_ENABLED: 'true',
    KSTOCK_DART_ENABLED: 'true',
    KSTOCK_BROKER_ENABLED: 'false',
    KSTOCK_LIVE_TRADING_ENABLED: 'false',
  };
  const environmentXml = Object.entries(environment).map(([key, value]) => `
    <key>${xmlEscape(key)}</key>
    ${plistString(value)}`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  ${plistString('com.k-stock-ai.api')}
  <key>ProgramArguments</key>
  <array>
    ${plistString(nodeExecutable)}
    ${plistString(serverPath)}
  </array>
  <key>WorkingDirectory</key>
  ${plistString(workingDirectory)}
  <key>EnvironmentVariables</key>
  <dict>${environmentXml}
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  ${plistString(path.join(reportDirectory, 'api.log'))}
  <key>StandardErrorPath</key>
  ${plistString(path.join(reportDirectory, 'api.log'))}
  <key>ProcessType</key>
  ${plistString('Background')}
</dict>
</plist>
`;
}