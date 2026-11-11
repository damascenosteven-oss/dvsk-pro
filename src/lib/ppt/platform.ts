import path from 'node:path';

export type PythonCommand = {
  command: string;
  prefixArgs: string[];
};

type Environment = Record<string, string | undefined>;

export function pythonCandidates(
  environment: Environment = process.env,
  platform: NodeJS.Platform = process.platform,
): PythonCommand[] {
  const explicit = environment.PPT_PYTHON_PATH?.trim();
  if (explicit) return [{ command: explicit, prefixArgs: [] }];
  return platform === 'win32'
    ? [{ command: 'py', prefixArgs: ['-3'] }, { command: 'python', prefixArgs: [] }]
    : [{ command: 'python3', prefixArgs: [] }, { command: 'python', prefixArgs: [] }];
}

export function browserCandidates(
  environment: Environment = process.env,
  platform: NodeJS.Platform = process.platform,
): string[] {
  const candidates: Array<string | undefined> = [environment.PPT_CHROME_PATH?.trim()];
  if (platform === 'win32') {
    const roots = [environment.PROGRAMFILES, environment['PROGRAMFILES(X86)'], environment.LOCALAPPDATA];
    for (const root of roots) {
      if (!root) continue;
      candidates.push(
        path.win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.win32.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      );
    }
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/microsoft-edge');
  }
  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
}
