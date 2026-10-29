'use client';

import { useRef } from 'react';

export const clampSidebarWidth = (width: number) => Math.min(480, Math.max(260, width));

export default function SidebarResizeHandle({ width, onChange }: { width: number; onChange: (width: number) => void }) {
  const drag = useRef<{ x: number; width: number } | null>(null);

  return <div
    className="sidebar-resizer" role="separator" tabIndex={0}
    aria-label="Thay đổi chiều rộng sidebar" aria-orientation="vertical"
    aria-valuemin={260} aria-valuemax={480} aria-valuenow={width}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      drag.current = { x: event.clientX, width };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (drag.current) onChange(clampSidebarWidth(drag.current.width + event.clientX - drag.current.x));
    }}
    onPointerUp={event => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 260 : event.key === 'End' ? 480 : width + (event.key === 'ArrowRight' ? 10 : -10);
      onChange(clampSidebarWidth(next));
    }}
  />;
}
