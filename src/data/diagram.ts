import { Position } from '@xyflow/react';
import type { ComponentType, DiagramData } from '../types';

/** [id, kind, label, x, y, width?] */
export type N = [string, ComponentType, string, number, number, number?];
/** [from, to, label?] */
export type E = [string, string, string?];

/** Compact builder for reference diagrams. Picks edge handles from relative node positions. */
export function diagram(nodes: N[], edges: E[]): DiagramData {
  const byId = new Map(nodes.map((n) => [n[0], n]));
  const W = 150;
  const H = 48;
  return {
    nodes: nodes.map(([id, kind, label, x, y, w]) => ({
      id,
      type: 'component' as const,
      position: { x, y },
      data: { kind, label },
      style: { width: w ?? (kind === 'note' ? 200 : W), height: kind === 'note' ? 70 : H },
    })),
    edges: edges.map(([s, t, label], i) => {
      const a = byId.get(s);
      const b = byId.get(t);
      if (!a || !b) throw new Error(`diagram: unknown node in edge ${s} -> ${t}`);
      const ax = a[3] + (a[5] ?? W) / 2;
      const ay = a[4] + H / 2;
      const bx = b[3] + (b[5] ?? W) / 2;
      const by = b[4] + H / 2;
      const dx = bx - ax;
      const dy = by - ay;
      let sh: Position, th: Position;
      if (Math.abs(dy) >= Math.abs(dx) * 0.6) {
        sh = dy > 0 ? Position.Bottom : Position.Top;
        th = dy > 0 ? Position.Top : Position.Bottom;
      } else {
        sh = dx > 0 ? Position.Right : Position.Left;
        th = dx > 0 ? Position.Left : Position.Right;
      }
      return { id: `e${i}`, source: s, target: t, sourceHandle: sh, targetHandle: th, label };
    }),
  };
}
