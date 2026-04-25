/* Standalone entry that mounts only the York OptiView HMI panel.
   Served by `vite.hmi.config.ts` on its own port for isolated UI work
   on the chiller HMI without spinning up the full 3D scene. */

import { createRoot } from 'react-dom/client';
import './index.css';
import { HMIPanel } from './components/ui/HMIPanel';

createRoot(document.getElementById('hmi-root')!).render(<HMIPanel />);
