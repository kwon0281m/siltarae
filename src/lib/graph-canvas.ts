import { EDGES, GROUPS, NODES, type GroupId } from "@/lib/graph-data";
import { createSimulation, settle, type SimEdge, type SimNode, type Simulation } from "@/lib/simulation";

export type Phase = "안정" | "흐름" | "정지";

export type GraphFrameState = {
  matchIds: ReadonlySet<string> | null;
  activeId: string | null;
  selectedId: string | null;
  showEdgeLabels: boolean;
};

export type GraphApi = {
  wake: () => void;
  reheat: () => void;
  setFrozen: (frozen: boolean) => void;
  releasePins: () => void;
  focusId: (id: string, force: boolean) => void;
  fit: () => void;
  destroy: () => void;
};

type Theme = {
  canvas: string;
  panel: string;
  ink: string;
  muted: string;
  faint: string;
  sage: string;
  place: string;
  dish: string;
  shop: string;
  ingredient: string;
};

type Rect = { x: number; y: number; w: number; h: number };

type HitBox = { index: number; x: number; y: number; r: number; label?: Rect };

type Drag =
  | { kind: "node"; index: number; moved: boolean; x: number; y: number }
  | { kind: "pan"; moved: boolean; x: number; y: number; panX: number; panY: number };

type Pinch = { dist: number; zoom: number; wx: number; wy: number };

type Anim = {
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  t0: number;
  dur: number;
};

const MIN_Z = 0.22;
const MAX_Z = 3.4;
const LABEL_FONT = 13;
const EDGE_FONT = 11;

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    canvas: pick("--color-canvas", "#0c0d10"),
    panel: pick("--color-panel", "#14161a"),
    ink: pick("--color-ink", "#f3f4f6"),
    muted: pick("--color-muted", "#a1a6b0"),
    faint: pick("--color-faint", "#717784"),
    sage: pick("--color-sage", "#7e948c"),
    place: pick("--node-place", "#d5dae2"),
    dish: pick("--node-dish", "#9aa6b4"),
    shop: pick("--node-shop", "#7e948c"),
    ingredient: pick("--node-ingredient", "#6a7888"),
  };
}

function groupColor(theme: Theme, group: GroupId): string {
  return theme[group];
}

function hexToRgba(color: string, alpha: number): string {
  const hex = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function overlaps(a: Rect, b: Rect, pad = 3) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function pointInRect(x: number, y: number, rect: Rect, pad: number) {
  return x >= rect.x - pad && y >= rect.y - pad && x <= rect.x + rect.w + pad && y <= rect.y + rect.h + pad;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function mountGraph(
  canvas: HTMLCanvasElement,
  options: {
    getState: () => GraphFrameState;
    onSelect: (id: string | null) => void;
    onPinned: (count: number) => void;
    onPhase: (phase: Phase) => void;
  },
): GraphApi {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("캔버스를 열 수 없습니다.");
  const ctx: CanvasRenderingContext2D = context;

  const sim: Simulation = createSimulation(NODES, EDGES);
  settle(sim, 320);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const labelFont = `500 ${LABEL_FONT}px ${family}`;
  const edgeFont = `500 ${EDGE_FONT}px ${family}`;
  const textCache = new Map<string, number>();

  let theme = readTheme();
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let userMoved = false;
  let didFit = false;
  let hover = -1;
  let drag: Drag | null = null;
  let pinch: Pinch | null = null;
  let anim: Anim | null = null;
  let raf = 0;
  let lastPhase: Phase | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let hitBoxes: HitBox[] = [];

  function fontWidth(text: string, font: string) {
    const key = font + "\0" + text;
    const cached = textCache.get(key);
    if (cached != null) return cached;
    ctx.font = font;
    const width = ctx.measureText(text).width;
    textCache.set(key, width);
    return width;
  }

  function syncPhase() {
    const phase: Phase = sim.frozen ? "정지" : sim.alpha > 0.02 ? "흐름" : "안정";
    if (phase !== lastPhase) {
      lastPhase = phase;
      options.onPhase(phase);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.max(1, Math.round(cssW * dpr));
    const nextH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW;
      canvas.height = nextH;
    }
  }

  function insets() {
    const narrow = cssW < 760;
    const selected = Boolean(options.getState().selectedId);
    if (narrow) {
      return { top: 196, bottom: selected ? 430 : 96, left: 24, right: 24 };
    }
    return { top: 28, bottom: 84, left: 72, right: selected ? 348 : 40 };
  }

  function bounds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of sim.nodes) {
      minX = Math.min(minX, node.x - node.r);
      minY = Math.min(minY, node.y - node.r);
      maxX = Math.max(maxX, node.x + node.r);
      maxY = Math.max(maxY, node.y + node.r);
    }
    return { minX, minY, maxX, maxY };
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function animateTo(x: number, y: number, z: number) {
    if (reduced) {
      panX = x;
      panY = y;
      zoom = z;
      anim = null;
      wake();
      return;
    }
    anim = {
      fromX: panX,
      fromY: panY,
      fromZ: zoom,
      toX: x,
      toY: y,
      toZ: z,
      t0: performance.now(),
      dur: 280,
    };
    wake();
  }

  function fit(animate: boolean) {
    if (cssW < 2 || cssH < 2) return;
    const box = bounds();
    const bw = Math.max(1, box.maxX - box.minX);
    const bh = Math.max(1, box.maxY - box.minY);
    const pad = insets();
    const availW = Math.max(48, cssW - pad.left - pad.right);
    const availH = Math.max(48, cssH - pad.top - pad.bottom);
    const z = clamp(Math.min(availW / bw, availH / bh), MIN_Z, 1.8);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const sx = pad.left + availW / 2;
    const sy = pad.top + availH / 2;
    userMoved = false;
    if (animate) animateTo(sx - cx * z, sy - cy * z, z);
    else {
      panX = sx - cx * z;
      panY = sy - cy * z;
      zoom = z;
      anim = null;
      wake();
    }
  }

  function focusId(id: string, force: boolean) {
    const index = sim.indexById.get(id);
    if (index == null || cssW < 2) return;
    const node = sim.nodes[index];
    const pad = insets();
    const sx = node.x * zoom + panX;
    const sy = node.y * zoom + panY;
    const visible =
      sx > pad.left + 12 && sx < cssW - pad.right - 12 && sy > pad.top + 12 && sy < cssH - pad.bottom - 12;
    if (visible && !force) return;
    let z = zoom;
    if (force && z < 0.95) z = 1.05;
    const cx = (pad.left + cssW - pad.right) / 2;
    const cy = (pad.top + cssH - pad.bottom) / 2;
    userMoved = true;
    animateTo(cx - node.x * z, cy - node.y * z, z);
  }

  function zoomAt(sx: number, sy: number, factor: number) {
    const next = clamp(zoom * factor, MIN_Z, MAX_Z);
    const wx = (sx - panX) / zoom;
    const wy = (sy - panY) / zoom;
    zoom = next;
    panX = sx - wx * zoom;
    panY = sy - wy * zoom;
    userMoved = true;
    anim = null;
    wake();
  }

  function localPoint(event: { clientX: number; clientY: number }) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitTest(x: number, y: number) {
    const slop = 12;
    for (let i = hitBoxes.length - 1; i >= 0; i--) {
      const box = hitBoxes[i];
      const dx = x - box.x;
      const dy = y - box.y;
      if (dx * dx + dy * dy <= (box.r + slop) * (box.r + slop)) return box.index;
      if (box.label && pointInRect(x, y, box.label, 4)) return box.index;
    }
    return -1;
  }

  function pinchMetrics() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return null;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return {
      dist: Math.max(1, Math.hypot(dx, dy)),
      midX: (pts[0].x + pts[1].x) / 2,
      midY: (pts[0].y + pts[1].y) / 2,
    };
  }

  function screenOf(node: SimNode) {
    return { x: node.x * zoom + panX, y: node.y * zoom + panY, r: Math.max(3.2, node.r * zoom) };
  }

  function offscreen(x: number, y: number, pad = 80) {
    return x < -pad || y < -pad || x > cssW + pad || y > cssH + pad;
  }

  function drawShape(node: SimNode, x: number, y: number, r: number) {
    const shape = GROUPS[node.group].shape;
    const color = groupColor(theme, node.group);
    ctx.beginPath();
    if (shape === "round") {
      roundRect(ctx, x - r * 1.15, y - r * 0.78, r * 2.3, r * 1.56, r * 0.45);
      ctx.fillStyle = color;
      ctx.fill();
    } else if (shape === "diamond") {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else if (shape === "ring") {
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.canvas;
      ctx.fill();
      ctx.lineWidth = Math.max(1.25, r * 0.16);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (node.fx != null) {
      ctx.fillStyle = theme.canvas;
      ctx.fillRect(x + r * 0.45, y + r * 0.45, 4, 4);
    }
  }

  function draw() {
    if (cssW < 2 || cssH < 2) return;
    const state = options.getState();
    const matchIds = state.matchIds;
    const dimming = matchIds != null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = theme.canvas;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const hotEdge = (edge: SimEdge) => {
      const a = sim.nodes[edge.source];
      const b = sim.nodes[edge.target];
      const hoverId = hover >= 0 ? sim.nodes[hover].id : null;
      if (a.id === state.selectedId || b.id === state.selectedId) return true;
      if (a.id === state.activeId || b.id === state.activeId) return true;
      if (hoverId && (a.id === hoverId || b.id === hoverId)) return true;
      if (dimming && matchIds.has(a.id) && matchIds.has(b.id)) return true;
      return false;
    };

    for (const edge of sim.edges) {
      const a = sim.nodes[edge.source];
      const b = sim.nodes[edge.target];
      const p1 = screenOf(a);
      const p2 = screenOf(b);
      if (p1.x < -40 && p2.x < -40) continue;
      if (p1.y < -40 && p2.y < -40) continue;
      if (p1.x > cssW + 40 && p2.x > cssW + 40) continue;
      if (p1.y > cssH + 40 && p2.y > cssH + 40) continue;
      const hot = hotEdge(edge);
      const dim =
        dimming && !(matchIds.has(a.id) || matchIds.has(b.id))
          ? 0.07
          : hot
            ? 0.85
            : 0.28;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = hexToRgba(hot ? theme.ink : theme.faint, dim);
      ctx.lineWidth = hot ? 1.6 : 1;
      ctx.stroke();
    }

    const boxes: HitBox[] = [];
    const bodyRects: Rect[] = [];
    for (let i = 0; i < sim.nodes.length; i++) {
      const node = sim.nodes[i];
      const p = screenOf(node);
      if (offscreen(p.x, p.y, 60)) continue;
      const matched = !dimming || matchIds.has(node.id);
      ctx.globalAlpha = matched ? 1 : 0.16;
      drawShape(node, p.x, p.y, p.r);
      ctx.globalAlpha = 1;
      const selected = node.id === state.selectedId;
      const active = node.id === state.activeId;
      const hovered = i === hover;
      if (matched && dimming) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (active ? 6 : 4.5), 0, Math.PI * 2);
        ctx.strokeStyle = active ? theme.ink : theme.sage;
        ctx.lineWidth = active ? 2 : 1.25;
        ctx.stroke();
      }
      if (selected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (hovered && matched) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(theme.ink, 0.45);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      boxes.push({ index: i, x: p.x, y: p.y, r: p.r });
      bodyRects.push({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 });
    }

    const occupied = bodyRects.slice();
    const ordered = boxes
      .map((box) => {
        const node = sim.nodes[box.index];
        const hot =
          node.id === state.selectedId ||
          node.id === state.activeId ||
          box.index === hover ||
          (dimming && matchIds.has(node.id));
        return { box, node, hot };
      })
      .sort((a, b) => Number(b.hot) - Number(a.hot) || b.node.degree - a.node.degree);

    for (const item of ordered) {
      const { box, node, hot } = item;
      if (dimming && !matchIds.has(node.id)) continue;
      if (!hot && zoom < 0.56 && node.degree < 5) continue;
      const width = fontWidth(node.label, labelFont);
      const height = 16;
      const gap = 6;
      const candidates: Rect[] = [
        { x: box.x + box.r + gap, y: box.y - height / 2, w: width, h: height },
        { x: box.x - box.r - gap - width, y: box.y - height / 2, w: width, h: height },
        { x: box.x - width / 2, y: box.y + box.r + gap, w: width, h: height },
        { x: box.x - width / 2, y: box.y - box.r - gap - height, w: width, h: height },
      ];
      let place = hot ? candidates[0] : null;
      if (!hot) {
        for (const candidate of candidates) {
          if (candidate.x < 4 || candidate.y < 4 || candidate.x + candidate.w > cssW - 4) continue;
          if (occupied.some((rect) => overlaps(candidate, rect))) continue;
          place = candidate;
          break;
        }
      } else {
        for (const candidate of candidates) {
          if (!occupied.some((rect) => overlaps(candidate, rect, 1))) {
            place = candidate;
            break;
          }
        }
      }
      if (!place) continue;
      occupied.push(place);
      box.label = place;
      ctx.font = labelFont;
      ctx.lineWidth = 3;
      ctx.strokeStyle = theme.canvas;
      ctx.strokeText(node.label, place.x, place.y);
      ctx.fillStyle = hot ? theme.ink : theme.muted;
      ctx.fillText(node.label, place.x, place.y);
    }

    if (state.showEdgeLabels || state.selectedId || hover >= 0) {
      ctx.font = edgeFont;
      for (const edge of sim.edges) {
        const hot = hotEdge(edge);
        if (!hot && !state.showEdgeLabels) continue;
        if (!hot && zoom < 0.48) continue;
        const a = sim.nodes[edge.source];
        const b = sim.nodes[edge.target];
        const p1 = screenOf(a);
        const p2 = screenOf(b);
        const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (!hot && length < 64) continue;
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        if (mx < 0 || my < 0 || mx > cssW || my > cssH) continue;
        const width = fontWidth(edge.label, edgeFont);
        const pill: Rect = { x: mx - width / 2 - 5, y: my - 9, w: width + 10, h: 18 };
        if (!hot && occupied.some((rect) => overlaps(pill, rect, 1))) continue;
        occupied.push(pill);
        roundRect(ctx, pill.x, pill.y, pill.w, pill.h, 4);
        ctx.fillStyle = hexToRgba(theme.panel, hot ? 0.94 : 0.82);
        ctx.fill();
        ctx.fillStyle = hot ? theme.ink : theme.muted;
        ctx.fillText(edge.label, pill.x + 5, pill.y + 3);
      }
    }

    hitBoxes = boxes;
  }

  function frame(now: number) {
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const eased = 1 - (1 - t) ** 3;
      panX = anim.fromX + (anim.toX - anim.fromX) * eased;
      panY = anim.fromY + (anim.toY - anim.fromY) * eased;
      zoom = anim.fromZ + (anim.toZ - anim.fromZ) * eased;
      if (t >= 1) anim = null;
    }
    const cooling = !sim.frozen && sim.alpha > 0.015;
    if (cooling) sim.tick();
    draw();
    syncPhase();
    const busy = cooling || anim != null || drag != null || pointers.size > 0;
    if (busy) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const metrics = pinchMetrics();
      if (metrics) {
        const rect = canvas.getBoundingClientRect();
        const sx = metrics.midX - rect.left;
        const sy = metrics.midY - rect.top;
        pinch = { dist: metrics.dist, zoom, wx: (sx - panX) / zoom, wy: (sy - panY) / zoom };
      }
      drag = null;
      return;
    }
    const point = localPoint(event);
    const index = hitTest(point.x, point.y);
    if (index >= 0) {
      drag = { kind: "node", index, moved: false, x: point.x, y: point.y };
      canvas.style.cursor = "grabbing";
    } else {
      drag = { kind: "pan", moved: false, x: point.x, y: point.y, panX, panY };
      canvas.style.cursor = "grabbing";
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) {
      const point = localPoint(event);
      const index = hitTest(point.x, point.y);
      if (index !== hover) {
        hover = index;
        canvas.style.cursor = index >= 0 ? "pointer" : "grab";
        wake();
      }
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const metrics = pinchMetrics();
      if (!metrics) return;
      const rect = canvas.getBoundingClientRect();
      const sx = metrics.midX - rect.left;
      const sy = metrics.midY - rect.top;
      const next = clamp(pinch.zoom * (metrics.dist / pinch.dist), MIN_Z, MAX_Z);
      zoom = next;
      panX = sx - pinch.wx * zoom;
      panY = sy - pinch.wy * zoom;
      userMoved = true;
      anim = null;
      wake();
      return;
    }
    if (!drag) return;
    const point = localPoint(event);
    const dx = point.x - drag.x;
    const dy = point.y - drag.y;
    if (!drag.moved && dx * dx + dy * dy > 16) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === "pan") {
      panX = drag.panX + dx;
      panY = drag.panY + dy;
      userMoved = true;
      anim = null;
    } else {
      const node = sim.nodes[drag.index];
      const wx = (point.x - panX) / zoom;
      const wy = (point.y - panY) / zoom;
      node.fx = wx;
      node.fy = wy;
      node.x = wx;
      node.y = wy;
      node.vx = 0;
      node.vy = 0;
      if (!sim.frozen) sim.alpha = Math.max(sim.alpha, 0.34);
      userMoved = true;
      anim = null;
    }
    wake();
  }

  function endPointer(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size > 0) {
      drag = null;
      return;
    }
    if (drag?.kind === "node") {
      options.onSelect(sim.nodes[drag.index].id);
      if (drag.moved) options.onPinned(sim.pinnedCount());
    } else if (drag?.kind === "pan" && !drag.moved) {
      options.onSelect(null);
    }
    drag = null;
    const point = localPoint(event);
    hover = hitTest(point.x, point.y);
    canvas.style.cursor = hover >= 0 ? "pointer" : "grab";
    wake();
  }

  function onDoubleClick(event: MouseEvent) {
    const point = localPoint(event);
    const index = hitTest(point.x, point.y);
    if (index >= 0) {
      const node = sim.nodes[index];
      node.fx = null;
      node.fy = null;
      if (!sim.frozen) sim.alpha = Math.max(sim.alpha, 0.6);
      options.onPinned(sim.pinnedCount());
      wake();
      return;
    }
    fit(true);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const point = localPoint(event);
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    zoomAt(point.x, point.y, Math.exp(-delta * 0.0014));
  }

  function onResize() {
    const before = userMoved;
    resize();
    if (!didFit && cssW > 0 && cssH > 0) {
      fit(false);
      didFit = true;
    } else if (!before) {
      fit(false);
    } else {
      wake();
    }
  }

  const observer = new ResizeObserver(() => onResize());
  observer.observe(canvas);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  const onFont = () => {
    textCache.clear();
    theme = readTheme();
    wake();
  };
  document.fonts?.ready.then(onFont).catch(() => undefined);
  resize();
  if (cssW > 0 && cssH > 0) {
    fit(false);
    didFit = true;
  }
  syncPhase();
  canvas.style.cursor = "grab";

  return {
    wake,
    reheat() {
      sim.reheat();
      options.onPhase("흐름");
      lastPhase = "흐름";
      wake();
    },
    setFrozen(frozen: boolean) {
      sim.setFrozen(frozen);
      syncPhase();
      wake();
    },
    releasePins() {
      sim.unpinAll();
      if (!sim.frozen) sim.alpha = Math.max(sim.alpha, 0.75);
      options.onPinned(0);
      wake();
    },
    focusId,
    fit() {
      fit(true);
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("wheel", onWheel);
    },
  };
}
