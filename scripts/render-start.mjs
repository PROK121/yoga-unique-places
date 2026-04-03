/**
 * Запуск продакшен-сборки на Render: читает PORT из окружения (без shell-подстановок).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = process.env.PORT || '4173';
const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, '..');
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '0.0.0.0', '--port', port],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  },
);

child.on('exit', (code) => process.exit(code ?? 1));
