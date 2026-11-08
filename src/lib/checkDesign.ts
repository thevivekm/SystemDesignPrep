import type { DesignCheck, DesignNode, DiagramData, Sel } from '../types';

export interface CheckResult {
  label: string;
  passed: boolean;
}

const matches = (n: DesignNode, sel: Sel) => (sel.ids?.includes(n.id) ?? false) || (sel.kinds?.includes(n.data.kind) ?? false);

/**
 * Evaluates declarative checks against a diagram. Connections are treated as
 * undirected: what matters is that two components talk to each other.
 */
export function checkDesign(d: DiagramData, checks: DesignCheck[]): CheckResult[] {
  const nodes = d.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]));
  for (const e of d.edges) {
    if (!byId.has(e.source) || !byId.has(e.target) || e.source === e.target) continue;
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }
  const pick = (sel: Sel) => nodes.filter((n) => matches(n, sel));
  const linked = (a: string, b: string) => adj.get(a)?.has(b) ?? false;
  const anyLink = (as: DesignNode[], bs: DesignNode[]) => as.some((a) => bs.some((b) => a.id !== b.id && linked(a.id, b.id)));

  const reaches = (from: DesignNode[], to: DesignNode[], blocked: Set<string>) => {
    const fromIds = new Set(from.map((n) => n.id));
    const targets = new Set(to.map((n) => n.id).filter((id) => !fromIds.has(id)));
    const seen = new Set<string>();
    const stack = [...fromIds].filter((id) => !blocked.has(id));
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      if (targets.has(id)) return true;
      for (const nb of adj.get(id) ?? []) if (!seen.has(nb) && !blocked.has(nb)) stack.push(nb);
    }
    return false;
  };

  return checks.map((c) => {
    let passed = false;
    switch (c.type) {
      case 'exists':
        passed = pick(c.sel).length >= (c.min ?? 1);
        break;
      case 'link':
        passed = anyLink(pick(c.a), pick(c.b));
        break;
      case 'noLink':
        passed = !anyLink(pick(c.a), pick(c.b));
        break;
      case 'fanout': {
        const tos = pick(c.to);
        passed = pick(c.from).some((f) => tos.filter((t) => t.id !== f.id && linked(f.id, t.id)).length >= c.min);
        break;
      }
      case 'via': {
        const as = pick(c.a);
        const bs = pick(c.b);
        passed = pick(c.via).some((v) => as.some((a) => a.id !== v.id && linked(a.id, v.id)) && bs.some((b) => b.id !== v.id && linked(b.id, v.id)));
        break;
      }
      case 'reach':
        passed = reaches(pick(c.a), pick(c.b), new Set());
        break;
      case 'through': {
        const blocked = new Set(pick(c.via).map((n) => n.id));
        passed = blocked.size > 0 && reaches(pick(c.a), pick(c.b), new Set()) && !reaches(pick(c.a), pick(c.b), blocked);
        break;
      }
    }
    return { label: c.label, passed };
  });
}
