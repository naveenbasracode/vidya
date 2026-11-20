// Runs the backend (port 5050) and frontend (port 3000) together. Ctrl+C stops both.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Make sure each app's installed packages match its package.json (catches a missing or stale `npm install`).
const missing = [];
for (const dir of ['backend', 'frontend']) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, dir, 'package.json'), 'utf8'));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const installed = path.join(root, dir, 'node_modules', name, 'package.json');
    if (!fs.existsSync(installed)) {
      missing.push(`${dir}: ${name}`);
      continue;
    }
    const wantMajor = (pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]).match(/\d+/)?.[0];
    const haveMajor = JSON.parse(fs.readFileSync(installed, 'utf8')).version.split('.')[0];
    if (wantMajor && wantMajor !== haveMajor) missing.push(`${dir}: ${name} (need v${wantMajor}, found v${haveMajor})`);
  }
}
if (missing.length) {
  console.error(`\n✖ Some packages are missing or the wrong version:\n  ${missing.join('\n  ')}\n`);
  console.error('Fix it by running:  ./scripts/setup.sh   (or `npm install` inside backend/ and frontend/)\n');
  process.exit(1);
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Everything is also written to logs/dev.log (handy for troubleshooting).
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
const logFile = fs.createWriteStream(path.join(root, 'logs', 'dev.log'), { flags: 'a' });
logFile.write(`\n===== npm run dev started ${new Date().toISOString()} =====\n`);

const run = (name, dir, color) => {
  const child = spawn(npm, ['run', 'dev'], { cwd: path.join(root, dir), env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) =>
      buf
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => {
          out.write(prefix + line + '\n');
          logFile.write(`[${name}] ${line}\n`);
        }),
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
