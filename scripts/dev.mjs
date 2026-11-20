// Runs the backend (port 5000) and frontend (port 3000) together. Ctrl+C stops both.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (name, dir, color) => {
  const child = spawn(npm, ['run', 'dev'], { cwd: path.join(root, dir), env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) =>
      buf
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => out.write(prefix + line + '\n')),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown();
  });
  return child;
};

const children = [run('api', 'backend', 36), run('web', 'frontend', 35)];
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill('SIGINT'));
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log('\n🦉 Vidya is starting… open http://localhost:3000 once both servers are ready.\n');
