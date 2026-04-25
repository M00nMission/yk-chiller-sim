/* Dedicated dev server for the standalone York OptiView HMI page.
   Serves *only* the HMIPanel component (no 3D scene) on port 5180,
   strictly separated from the main simulation app (which runs on
   port 5173 via `npm run dev`).

   Run modes:
     • `npm run dev:hmi`  — just this server (HMI window only).
     • `npm run dev:all`  — main simulation (5173) + HMI (5180) in
                            parallel, each in its own browser window.

   On macOS, the HMI auto-opens in a *new* Chrome window (chromeless
   `--app=` mode for an authentic operator-panel feel). On other
   platforms, vite's default `open` behavior is used. */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const HMI_PORT = 5180;
const HMI_URL = `http://localhost:${HMI_PORT}/`;

/* Force a brand-new browser window for the HMI (rather than a tab in
   whatever browser is hosting the main simulation on port 5173).
   We use Chrome's chromeless `--app=` mode where available, which
   gives a clean kiosk-style window — no tabs, no address bar — that
   feels like a real operator panel.  Falls back to the OS default
   browser when Chrome isn't installed. */
function openHmiInNewWindow(): Plugin {
  return {
    name: 'hmi-open-new-window',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/') req.url = '/hmi.html';
        next();
      });

      server.httpServer?.once('listening', () => {
        const cmds: Array<{ cmd: string; args: string[] }> =
          platform() === 'darwin'
            ? [
                { cmd: 'open', args: ['-na', 'Google Chrome', '--args', '--new-window', `--app=${HMI_URL}`] },
                { cmd: 'open', args: [HMI_URL] },
              ]
            : platform() === 'win32'
              ? [
                  { cmd: 'cmd', args: ['/c', 'start', '""', 'chrome', '--new-window', `--app=${HMI_URL}`] },
                  { cmd: 'cmd', args: ['/c', 'start', '""', HMI_URL] },
                ]
              : [
                  { cmd: 'google-chrome', args: ['--new-window', `--app=${HMI_URL}`] },
                  { cmd: 'xdg-open', args: [HMI_URL] },
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
  plugins: [react(), tailwindcss(), openHmiInNewWindow()],
  server: {
    port: HMI_PORT,
    strictPort: true,
    /* Window-opening is handled by `openHmiInNewWindow` so we get a
       *new* browser window rather than vite's default tab-in-current. */
    open: false,
  },
  preview: {
    port: HMI_PORT,
    strictPort: true,
  },
});
