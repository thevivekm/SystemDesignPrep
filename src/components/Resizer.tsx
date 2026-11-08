import { useCallback } from 'react';

/** Drag handle that reports pointer delta along an axis. */
export function Resizer({ axis, onDelta }: { axis: 'x' | 'y'; onDelta: (d: number) => void }) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      let last = axis === 'x' ? e.clientX : e.clientY;
      const move = (ev: PointerEvent) => {
        const cur = axis === 'x' ? ev.clientX : ev.clientY;
        onDelta(cur - last);
        last = cur;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [axis, onDelta]
  );
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      className={`group relative z-10 shrink-0 bg-slate-200 dark:bg-slate-800 ${axis === 'x' ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'}`}
    >
      <div className={`absolute bg-transparent group-hover:bg-indigo-400/50 ${axis === 'x' ? '-left-1 -right-1 inset-y-0' : '-top-1 -bottom-1 inset-x-0'}`} />
    </div>
  );
}
