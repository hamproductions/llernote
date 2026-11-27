import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from 'styled-system/jsx';

export const useOffscreenCapture = (offscreen: boolean) => {
  const [visible, setVisible] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const cloneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offscreen || !visible) return;
    const observer = new ResizeObserver(() => setWidth(visible.offsetWidth));
    observer.observe(visible);
    return () => observer.disconnect();
  }, [offscreen, visible]);

  const target = () => {
    if (!offscreen) return visible;
    cloneRef.current?.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager';
    });
    return cloneRef.current;
  };

  return {
    visibleRef: setVisible,
    cloneRef,
    cloneWidth: offscreen && visible ? width : 0,
    target
  };
};

export function OffscreenStage({ width, children }: { width: number; children: ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      inert
      style={{ width }}
      position="fixed"
      top="0"
      left="-10000px"
      pointerEvents="none"
    >
      {children}
    </Box>
  );
}
