"""Local validation only: never send an input event to another foreground app."""
import re
import subprocess
import time

ADB = '/Users/ari/Library/Android/sdk/platform-tools/adb'
SERIAL = 'RFCW1178RRE'
PACKAGE = 'ai.kstock.mobile.localvalidation'

def is_kstock_foreground(activity_dump):
    lines = [line for line in activity_dump.splitlines() if 'topResumedActivity=' in line]
    return len(lines) == 1 and bool(re.search(r'\s' + re.escape(PACKAGE) + r'/[^\s}]+', lines[0]))

def _read(*args):
    return subprocess.run([ADB, '-s', SERIAL, *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

def require_foreground():
    if not is_kstock_foreground(_read('shell', 'dumpsys', 'activity', 'activities').decode()):
        raise RuntimeError('KSTOCK_NOT_FOREGROUND_INPUT_BLOCKED')

def tap(x, y):
    require_foreground()
    _read('shell', 'input', 'tap', str(x), str(y))
    time.sleep(0.8)

def swipe(x1, y1, x2, y2, duration=600):
    require_foreground()
    _read('shell', 'input', 'swipe', *map(str, (x1, y1, x2, y2, duration)))
    time.sleep(0.8)

def screenshot(destination):
    require_foreground()
    with open(destination, 'wb') as output:
        output.write(_read('exec-out', 'screencap', '-p'))
