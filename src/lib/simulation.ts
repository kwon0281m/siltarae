import type { GraphEdge, GraphNode, GroupId } from "@/lib/graph-data";

export type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  r: number;
  degree: number;
};

export type SimEdge = {
  source: number;
  target: number;
  label: string;
  rest: number;
  strength: number;
};

export type Simulation = {
  nodes: SimNode[];
  edges: SimEdge[];
  alpha: number;
  frozen: boolean;
  indexById: Map<string, number>;
  tick: () => void;
  reheat: () => void;
  setFrozen: (frozen: boolean) => void;
  unpinAll: () => void;
  pinnedCount: () => number;
};

const ALPHA_DECAY = 0.02;
const VELOCITY_DECAY = 0.42;
const REPULSION = 2600;
const CENTER = 0.01;
const GROUP = 0.012;
const COLLISION_GAP = 20;
const MAX_SPEED = 16;

const HOMES: Record<GroupId, { x: number; y: number }> = {
  place: { x: -300, y: -30 },
  shop: { x: -30, y: 250 },
  dish: { x: 300, y: 20 },
  ingredient: { x: 20, y: -270 },
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function linkDistance(label: string): number {
  if (label === "인근" || label === "2호선") return 200;
  if (label === "자리") return 74;
  if (label === "메뉴" || label === "세트" || label === "곁들임") return 88;
  if (
    label === "재료" ||
    label === "면" ||
    label === "육수" ||
    label === "양념" ||
    label === "쌈" ||
    label === "발효" ||
    label === "튀김옷" ||
    label === "반죽" ||
    label === "속" ||
    label === "피"
  ) {
    return 66;
  }
  return 120;
}

function linkStrength(label: string): number {
  if (label === "인근" || label === "2호선") return 0.018;
  if (label === "자리" || label === "메뉴") return 0.085;
  if (label === "대표" || label === "계절" || label === "골목") return 0.032;
  return 0.05;
}

export function createSimulation(nodesIn: GraphNode[], edgesIn: GraphEdge[]): Simulation {
  const degree = new Map<string, number>();
  for (const node of nodesIn) degree.set(node.id, 0);
  for (const edge of edgesIn) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const seenInGroup = new Map<GroupId, number>();
  const nodes: SimNode[] = nodesIn.map((node) => {
    const index = seenInGroup.get(node.group) ?? 0;
    seenInGroup.set(node.group, index + 1);
    const home = HOMES[node.group];
    const angle = index * 0.85 + hash(node.id) * Math.PI * 2;
    const ring = 36 + (index % 4) * 22;
    const deg = degree.get(node.id) ?? 0;
    return {
      ...node,
      x: home.x + Math.cos(angle) * ring,
      y: home.y + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      r: Math.min(16, 8.5 + deg * 0.55),
      degree: deg,
    };
  });

  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const edges: SimEdge[] = [];
  for (const edge of edgesIn) {
    const source = indexById.get(edge.source);
    const target = indexById.get(edge.target);
    if (source == null || target == null) continue;
    edges.push({
      source,
      target,
      label: edge.label,
      rest: linkDistance(edge.label),
      strength: linkStrength(edge.label),
    });
  }

  const sim: Simulation = {
    nodes,
    edges,
    alpha: 1,
    frozen: false,
    indexById,
    tick,
    reheat,
    setFrozen,
    unpinAll,
    pinnedCount,
  };

  function tick() {
    if (sim.frozen) return;
    const alpha = sim.alpha;
    const list = sim.nodes;
    const count = list.length;

    for (let i = 0; i < count; i++) {
      const a = list[i];
      for (let j = i + 1; j < count; j++) {
        const b = list[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist2 = dx * dx + dy * dy;
        if (dist2 < 0.01) {
          const nudge = hash(a.id + b.id);
          dx = nudge - 0.5 || 0.2;
          dy = hash(b.id + a.id) - 0.5 || 0.2;
          dist2 = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(dist2);
        const mag = (REPULSION * alpha) / dist2;
        const ux = (dx / dist) * mag;
        const uy = (dy / dist) * mag;
        a.vx -= ux;
        a.vy -= uy;
        b.vx += ux;
        b.vy += uy;
      }
    }

    for (const edge of sim.edges) {
      const a = list[edge.source];
      const b = list[edge.target];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist < 1) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const mag = ((dist - edge.rest) / dist) * edge.strength * alpha;
      const ux = dx * mag;
      const uy = dy * mag;
      a.vx += ux;
      a.vy += uy;
      b.vx -= ux;
      b.vy -= uy;
    }

    for (const node of list) {
      const home = HOMES[node.group];
      node.vx += (home.x - node.x) * GROUP * alpha;
      node.vy += (home.y - node.y) * GROUP * alpha;
      node.vx += -node.x * CENTER * alpha;
      node.vy += -node.y * CENTER * alpha;
    }

    for (const node of list) {
      if (node.fx != null && node.fy != null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= VELOCITY_DECAY;
      node.vy *= VELOCITY_DECAY;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > MAX_SPEED) {
        node.vx = (node.vx / speed) * MAX_SPEED;
        node.vy = (node.vy / speed) * MAX_SPEED;
      }
      node.x += node.vx;
      node.y += node.vy;
    }

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < count; i++) {
        const a = list[i];
        for (let j = i + 1; j < count; j++) {
          const b = list[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          const min = a.r + b.r + COLLISION_GAP;
          if (dist >= min) continue;
          if (dist < 0.01) {
            dx = 1;
            dy = 0;
            dist = 1;
          }
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          const aPin = a.fx != null;
          const bPin = b.fx != null;
          if (aPin && bPin) continue;
          if (aPin) {
            b.x += ux * push * 2;
            b.y += uy * push * 2;
          } else if (bPin) {
            a.x -= ux * push * 2;
            a.y -= uy * push * 2;
          } else {
            a.x -= ux * push;
            a.y -= uy * push;
            b.x += ux * push;
            b.y += uy * push;
          }
        }
      }
    }

    sim.alpha += (0 - sim.alpha) * ALPHA_DECAY;
  }

  function reheat() {
    sim.frozen = false;
    sim.alpha = 1;
  }

  function setFrozen(frozen: boolean) {
    sim.frozen = frozen;
    if (frozen) {
      for (const node of sim.nodes) {
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }
    if (sim.alpha < 0.2) sim.alpha = 0.45;
  }

  function unpinAll() {
    for (const node of sim.nodes) {
      node.fx = null;
      node.fy = null;
    }
  }

  function pinnedCount() {
    let count = 0;
    for (const node of sim.nodes) if (node.fx != null) count += 1;
    return count;
  }

  return sim;
}

export function settle(sim: Simulation, steps: number) {
  const wasFrozen = sim.frozen;
  sim.frozen = false;
  sim.alpha = 1;
  for (let i = 0; i < steps; i++) sim.tick();
  sim.frozen = wasFrozen;
}
