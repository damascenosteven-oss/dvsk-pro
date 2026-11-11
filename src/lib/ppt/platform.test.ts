import assert from 'node:assert/strict';
import test from 'node:test';
import { browserCandidates, pythonCandidates } from './platform';

test('python candidates respect explicit paths including spaces', () => {
  assert.deepEqual(
    pythonCandidates({ PPT_PYTHON_PATH: 'C:\\Program Files\\Python\\python.exe' }, 'win32'),
    [{ command: 'C:\\Program Files\\Python\\python.exe', prefixArgs: [] }],
  );
});

test('python candidates are ordered for Windows and Unix platforms', () => {
  assert.deepEqual(pythonCandidates({}, 'win32'), [
    { command: 'py', prefixArgs: ['-3'] },
    { command: 'python', prefixArgs: [] },
  ]);
  assert.deepEqual(pythonCandidates({}, 'darwin'), [
    { command: 'python3', prefixArgs: [] },
    { command: 'python', prefixArgs: [] },
  ]);
});

test('browser candidates prefer explicit configuration and include Windows Chrome and Edge', () => {
  const candidates = browserCandidates(
    {
      PPT_CHROME_PATH: 'D:\\Portable Apps\\Chrome\\chrome.exe',
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\friend\\AppData\\Local',
    },
    'win32',
  );
  assert.equal(candidates[0], 'D:\\Portable Apps\\Chrome\\chrome.exe');
  assert.ok(candidates.some(candidate => candidate.endsWith('Google\\Chrome\\Application\\chrome.exe')));
  assert.ok(candidates.some(candidate => candidate.endsWith('Microsoft\\Edge\\Application\\msedge.exe')));
});

test('browser candidates include the native macOS application path', () => {
  assert.ok(
    browserCandidates({}, 'darwin').includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
  );
});
