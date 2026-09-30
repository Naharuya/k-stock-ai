import 'dotenv/config';
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApiLaunchAgent, buildWatchlistLaunchAgent } from './services/launchd_schedule.js';

if (process.platform !== 'darwin') throw new Error('The watchlist LaunchAgent installer requires macOS');
if (process.env.KSTOCK_LIVE_TRADING_ENABLED === 'true' || process.env.KSTOCK_BROKER_ENABLED === 'true') {
  throw new Error('Refusing to install a scheduled job while trading or broker access is enabled');
}

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const launchAgentsDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents');
const reportDirectory = path.join(projectDirectory, 'data', 'reports');
const domain = `gui/${process.getuid()}`;

await mkdir(launchAgentsDirectory, { recursive: true, mode: 0o700 });
await mkdir(reportDirectory, { recursive: true, mode: 0o700 });
await chmod(reportDirectory, 0o700);

const agents = [
  {
    label: 'com.k-stock-ai.api',
    plist: buildApiLaunchAgent({ projectDirectory, nodePath: process.execPath }),
    schedule: 'starts at login, restarts if it exits',
  },
  {
    label: 'com.k-stock-ai.watchlist',
    plist: buildWatchlistLaunchAgent({ projectDirectory, nodePath: process.execPath }),
    schedule: 'weekdays at 17:30 local time',
  },
];

for (const agent of agents) {
  const plistPath = path.join(launchAgentsDirectory, `${agent.label}.plist`);
  const temporaryPath = `${plistPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, agent.plist, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await rename(temporaryPath, plistPath);
  await chmod(plistPath, 0o600);

  try {
    execFileSync('launchctl', ['bootout', `${domain}/${agent.label}`], { stdio: 'ignore' });
  } catch {
  }
  execFileSync('launchctl', ['enable', `${domain}/${agent.label}`], { stdio: 'ignore' });
  execFileSync('launchctl', ['bootstrap', domain, plistPath], { stdio: 'inherit' });
}

console.log(JSON.stringify({ installed: true, agents: agents.map(({ label, schedule }) => ({ label, schedule })) }));