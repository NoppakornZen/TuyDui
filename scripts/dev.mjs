import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const production = process.argv.includes('--production');
const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else child.kill('SIGTERM');
  }
}

const commands = production
  ? [['backend', ['--env-file-if-exists=.env.local', 'dist/server.js']], ['frontend', ['../node_modules/next/dist/bin/next', 'start']]]
  : [['backend', ['--env-file-if-exists=.env.local', '--watch', '--import', 'tsx', 'src/server.ts']], ['frontend', ['../node_modules/next/dist/bin/next', 'dev']]];

for (const [directory, args] of commands) {
  const child = spawn(process.execPath, args, { cwd: `${root}/${directory}`, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code ?? 1));
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
