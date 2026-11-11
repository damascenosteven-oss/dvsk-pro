#!/usr/bin/env node
import process from 'node:process';
import { isPortAvailable, runChild } from './task-runner-lib.mjs';

const task = process.argv[2];
const workspace = process.env.COZE_WORKSPACE_PATH || process.cwd();
const port = Number.parseInt(process.env.DEPLOY_RUN_PORT || process.env.PORT || '5000', 10);

async function execute(command, args, environment = process.env) {
  const code = await runChild(command, args, { cwd: workspace, env: environment, stdio: 'inherit' });
  if (code !== 0) process.exit(code);
}

async function requireFreePort() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${port}`);
  if (!(await isPortAvailable(port))) {
    throw new Error(`Port ${port} is already in use. Stop the existing service or choose DEPLOY_RUN_PORT.`);
  }
}

switch (task) {
  case 'prepare':
    await execute('pnpm', ['install', '--prefer-frozen-lockfile', '--prefer-offline', '--reporter=append-only']);
    break;
  case 'build':
    await execute('pnpm', ['install', '--prefer-frozen-lockfile', '--prefer-offline', '--reporter=append-only']);
    await execute('pnpm', ['exec', 'next', 'build']);
    await execute('pnpm', ['exec', 'tsup', 'src/server.ts', 'src/ppt-cleanup.ts', '--format', 'cjs', '--platform', 'node', '--target', 'node20', '--outDir', 'dist', '--no-splitting', '--no-minify']);
    break;
  case 'dev':
    await requireFreePort();
    await execute('pnpm', ['exec', 'tsx', 'watch', 'src/server.ts'], { ...process.env, PORT: String(port) });
    break;
  case 'start':
    await requireFreePort();
    await execute(process.execPath, ['dist/server.js'], { ...process.env, PORT: String(port) });
    break;
  case 'validate':
    await execute('pnpm', ['run', 'ts-check']);
    await execute('pnpm', ['run', 'lint:build']);
    break;
  default:
    throw new Error('Usage: node scripts/task-runner.mjs <prepare|build|dev|start|validate>');
}
