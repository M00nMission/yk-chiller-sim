import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useInspectStore } from '../../store/useInspectStore';
import {
  buildInspectHitDetail,
  formatInspectClipboard,
  inspectObjectPath,
  pickInspectMeshHit,
} from './inspectHitDetail';

export function InspectRaycaster() {
  const inspectMode = useInspectStore((s) => s.inspectMode);
  const setHovered = useInspectStore((s) => s.setHovered);
  const setCopyFeedback = useInspectStore((s) => s.setCopyFeedback);
  const { camera, scene, pointer, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const ndcClick = useRef(new THREE.Vector2());
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef<{ name: string | null; path: string | null; detail: string | null }>({
    name: null,
    path: null,
    detail: null,
  });

  const scheduleCopyFeedback = (msg: string | null) => {
    if (copyFeedbackTimer.current) {
      clearTimeout(copyFeedbackTimer.current);
      copyFeedbackTimer.current = null;
    }
    setCopyFeedback(msg);
    if (msg) {
      copyFeedbackTimer.current = setTimeout(() => {
        setCopyFeedback(null);
        copyFeedbackTimer.current = null;
      }, 2400);
    }
  };

  useLayoutEffect(() => {
    gl.domElement.style.cursor = inspectMode ? 'crosshair' : '';
    return () => {
      gl.domElement.style.cursor = '';
    };
  }, [inspectMode, gl]);

  useLayoutEffect(() => {
    if (!inspectMode) return;
    const canvas = gl.domElement;

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      ndcClick.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndcClick.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const hit = pickInspectMeshHit(scene, camera, ndcClick.current, raycaster.current);
      if (!hit) {
        scheduleCopyFeedback('No inspectable mesh under click — nothing copied');
        return;
      }
      const text = formatInspectClipboard(hit);
      void navigator.clipboard.writeText(text).then(
        () => scheduleCopyFeedback('Copied mesh inspect data to clipboard'),
        () => scheduleCopyFeedback('Clipboard unavailable (blocked or insecure context)'),
      );
    };

    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('click', onClick);
      if (copyFeedbackTimer.current) {
        clearTimeout(copyFeedbackTimer.current);
        copyFeedbackTimer.current = null;
      }
    };
  }, [inspectMode, gl, scene, camera]);

  useFrame(() => {
    if (!inspectMode) {
      if (last.current.name !== null || last.current.path !== null || last.current.detail !== null) {
        last.current = { name: null, path: null, detail: null };
        setHovered(null, null, null);
      }
      return;
    }

    const meshHit = pickInspectMeshHit(scene, camera, pointer, raycaster.current);

    const name = meshHit
      ? meshHit.object.name || '(unnamed mesh)'
      : null;
    const path = meshHit ? inspectObjectPath(meshHit.object) : null;
    const detail = meshHit ? buildInspectHitDetail(meshHit) : null;

    if (
      last.current.name === name &&
      last.current.path === path &&
      last.current.detail === detail
    ) {
      return;
    }
    last.current = { name, path, detail };
    setHovered(name, path, detail);
  });

  return null;
}
