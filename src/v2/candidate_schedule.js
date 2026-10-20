import path from 'node:path';
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export function buildCandidateLaunchAgent({ projectDirectory, nodePath, hour = 6, minute = 30 } = {}) {
  if (!projectDirectory || !nodePath || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('Invalid candidate schedule');
  const root = path.resolve(projectDirectory);
  const logs = path.join(root, 'data/v2');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.k-stock-ai.candidates</string>
<key>ProgramArguments</key><array><string>${escape(path.resolve(nodePath))}</string><string>${escape(path.join(root, 'src/v2/run_candidates.js'))}</string><string>--collect</string></array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer></dict>
<key>RunAtLoad</key><false/><key>KeepAlive</key><false/>
<key>StandardOutPath</key><string>${escape(path.join(logs, 'schedule.log'))}</string>
<key>StandardErrorPath</key><string>${escape(path.join(logs, 'schedule-error.log'))}</string>
</dict></plist>\n`;
}
