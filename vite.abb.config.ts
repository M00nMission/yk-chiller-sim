/* Dedicated dev server for the standalone ABB ACH580 VFD panel.
   Serves *only* the ABBPanel component on port 5185, strictly
   separated from the main simulation (5173) and York HMI (5180).

   Run modes:
     • `npm run dev:abb`  — just this server (ABB window only).
     • `npm run dev:all`  — sim (5173) + York HMI (5180) + ABB (5185)
                            in parallel, each in its own browser window.

   On macOS, auto-opens in a *new* Chrome window (chromeless `--app=`
   mode) for an authentic operator-panel feel. Falls back to the OS
   default browser when Chrome isn't installed. */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const ABB_PORT = 5185;
const ABB_URL  = `http://localhost:${ABB_PORT}/`;

function openAbbInNewWindow(): Plugin {
  return {
    name: 'abb-open-new-window',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/') req.url = '/abb.html';
        next();
      });

      server.httpServer?.once('listening', () => {
        const cmds: Array<{ cmd: string; args: string[] }> =
          platform() === 'darwin'
            ? [
                { cmd: 'open', args: ['-na', 'Google Chrome', '--args', '--new-window', `--app=${ABB_URL}`] },
                { cmd: 'open', args: [ABB_URL] },
              ]
            : platform() === 'win32'
              ? [
                  { cmd: 'cmd', args: ['/c', 'start', '""', 'chrome', '--new-window', `--app=${ABB_URL}`] },
                  { cmd: 'cmd', args: ['/c', 'start', '""', ABB_URL] },
                ]
              : [
                  { cmd: 'google-chrome', args: ['--new-window', `--app=${ABB_URL}`] },
                  { cmd: 'xdg-open', args: [ABB_URL] },
                ];

        const tryNext = (i: number): void => {
          if (i >= cmds.length) return;
          const child = spawn(cmds[i].cmd, cmds[i].args, { stdio: 'ignore', detached: true });
          child.on('error', () => tryNext(i + 1));
          child.unref();
        };
        tryNext(0);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), openAbbInNewWindow()],
  server: {
    port: ABB_PORT,
    strictPort: true,
    open: false,
  },
  preview: {
    port: ABB_PORT,
    strictPort: true,
  },
});
