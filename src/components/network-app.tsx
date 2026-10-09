import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Pause, PinOff, Play, RefreshCw, Search, Spline, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EDGES, GROUPS, NODES, linksOf, searchNodes, type GraphNode } from "@/lib/graph-data";
import { mountGraph, type GraphApi, type Phase } from "@/lib/graph-canvas";

export function NetworkApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<GraphApi | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [pinned, setPinned] = useState(0);
  const [phase, setPhase] = useState<Phase>("안정");
  const [cursor, setCursor] = useState(0);
  const armedRef = useRef(false);

  const matches = useMemo(() => searchNodes(query), [query]);
  const selected = NODES.find((node) => node.id === selectedId) ?? null;
  const links = selected ? linksOf(selected.id) : [];

  const stateRef = useRef({
    matchIds: null as ReadonlySet<string> | null,
    activeId: null as string | null,
    selectedId: null as string | null,
    showEdgeLabels: true,
  });
  stateRef.current = {
    matchIds: query.trim() ? new Set(matches.map((node) => node.id)) : null,
    activeId: query.trim() && matches.length > 0 ? matches[Math.min(cursor, matches.length - 1)].id : null,
    selectedId,
    showEdgeLabels,
  };

  const onSelectRef = useRef<(id: string | null) => void>(() => undefined);
  onSelectRef.current = (id) => setSelectedId(id);
  const onPinnedRef = useRef<(count: number) => void>(() => undefined);
  onPinnedRef.current = (count) => setPinned(count);
  const onPhaseRef = useRef<(phase: Phase) => void>(() => undefined);
  onPhaseRef.current = (next) => setPhase(next);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const api = mountGraph(canvas, {
      getState: () => stateRef.current,
      onSelect: (id) => onSelectRef.current(id),
      onPinned: (count) => onPinnedRef.current(count),
      onPhase: (next) => onPhaseRef.current(next),
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.wake();
  }, [query, cursor, selectedId, showEdgeLabels]);

  useEffect(() => {
    setCursor(0);
    armedRef.current = false;
  }, [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"));
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === "Escape") {
        if (query) setQuery("");
        else setSelectedId(null);
      } else if ((event.key === "f" || event.key === "F") && !typing) {
        apiRef.current?.fit();
      } else if (event.key === " " && !typing) {
        event.preventDefault();
        setFrozen((current) => {
          const next = !current;
          apiRef.current?.setFrozen(next);
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query]);

  function cycle(dir: 1 | -1) {
    if (matches.length === 0) return;
    if (!armedRef.current) {
      armedRef.current = true;
      const index = dir === 1 ? 0 : matches.length - 1;
      setCursor(index);
      apiRef.current?.focusId(matches[index].id, true);
      return;
    }
    const next = (cursor + dir + matches.length) % matches.length;
    setCursor(next);
    apiRef.current?.focusId(matches[next].id, true);
  }

  function choose(node: GraphNode) {
    setSelectedId(node.id);
    apiRef.current?.focusId(node.id, false);
  }

  const matchLabel =
    query.trim().length === 0
      ? `${NODES.length}노드`
      : matches.length === 0
        ? "없음"
        : `${Math.min(cursor, matches.length - 1) + 1}/${matches.length}`;

  return (
    <main className="stage">
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        role="application"
        aria-label="힘 지향 네트워크 그래프. 노드를 끌어 옮기고, 빈 곳을 끌어 화면을 밀고, 휠이나 두 손가락으로 확대합니다."
      />

      <header className="topbar chrome-panel">
        <div className="title-row">
          <h1>실타래</h1>
          <p className="status" aria-live="polite">
            {phase}
          </p>
        </div>
        <p className="sub">
          서울 미식 연결망 · 예시
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span className="tabular">
            {NODES.length}노드 {EDGES.length}관계
          </span>
        </p>
        <ul className="legend">
          {(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map((id) => (
            <li key={id}>
              <span className="swatch" data-shape={GROUPS[id].shape} />
              {GROUPS[id].label}
            </li>
          ))}
        </ul>
        <div className="search-row">
          <div className="search-field">
            <Search className="icon search-icon" aria-hidden="true" />
            <label className="sr-only" htmlFor="node-search">
              노드 검색
            </label>
            <Input
              ref={inputRef}
              id="node-search"
              value={query}
              placeholder="노드, 설명, 관계"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  cycle(event.shiftKey ? -1 : 1);
                }
              }}
            />
            {query ? (
              <button type="button" className="search-clear" aria-label="검색어 지우기" onClick={() => setQuery("")}>
                <X className="icon" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="match-count tabular" aria-live="polite">
            {matchLabel}
          </p>
          {matches.length > 1 ? (
            <div className="match-nav">
              <Button aria-label="이전 일치 노드" onClick={() => cycle(-1)}>
                <ChevronLeft className="icon" aria-hidden="true" />
              </Button>
              <Button aria-label="다음 일치 노드" onClick={() => cycle(1)}>
                <ChevronRight className="icon" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
        {query.trim() && matches.length === 0 ? <p className="empty-note">일치하는 노드가 없습니다.</p> : null}
      </header>

      {selected ? (
        <aside className="inspector chrome-panel" aria-label={`${selected.label} 상세`}>
          <div className="inspector-head">
            <div>
              <p className="eyebrow">{GROUPS[selected.group].label}</p>
              <h2>{selected.label}</h2>
            </div>
            <Button aria-label="상세 닫기" onClick={() => setSelectedId(null)}>
              <X className="icon" aria-hidden="true" />
            </Button>
          </div>
          <p className="summary">{selected.summary}</p>
          <p className="meta tabular">연결 {links.length}</p>
          <h3>관계</h3>
          <ul className="link-list">
            {links.map((link) => (
              <li key={`${link.label}-${link.node.id}`}>
                <button type="button" onClick={() => choose(link.node)}>
                  <span>{link.node.label}</span>
                  <span className="rel">{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="hint">끌어 놓으면 그 자리에 고정됩니다. 더블클릭으로 풉니다.</p>
        </aside>
      ) : null}

      <div className="dock-wrap">
      <div className="dock chrome-panel">
        <Button
          variant="primary"
          aria-label="시뮬레이션 재가열"
          onClick={() => {
            apiRef.current?.reheat();
            setFrozen(false);
          }}
        >
          <RefreshCw className="icon" aria-hidden="true" />
          <span className="btn-label">재가열</span>
        </Button>
        <Button
          aria-label={frozen ? "시뮬레이션 재개" : "시뮬레이션 정지"}
          aria-pressed={frozen}
          onClick={() => {
            const next = !frozen;
            apiRef.current?.setFrozen(next);
            setFrozen(next);
          }}
        >
          {frozen ? <Play className="icon" aria-hidden="true" /> : <Pause className="icon" aria-hidden="true" />}
          <span className="btn-label">{frozen ? "재개" : "정지"}</span>
        </Button>
        <Button aria-label="화면에 맞추기" onClick={() => apiRef.current?.fit()}>
          <Maximize2 className="icon" aria-hidden="true" />
          <span className="btn-label">맞춤</span>
        </Button>
        <Button
          aria-label={showEdgeLabels ? "간선 이름 숨기기" : "간선 이름 보이기"}
          aria-pressed={showEdgeLabels}
          onClick={() => setShowEdgeLabels((value) => !value)}
        >
          <Spline className="icon" aria-hidden="true" />
          <span className="btn-label">간선명</span>
        </Button>
        <Button aria-label="고정된 노드 모두 풀기" disabled={pinned === 0} onClick={() => apiRef.current?.releasePins()}>
          <PinOff className="icon" aria-hidden="true" />
          <span className="btn-label">풀기{pinned > 0 ? ` ${pinned}` : ""}</span>
        </Button>
      </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `${selected.label}. ${GROUPS[selected.group].label}. ${selected.summary}` : "노드를 누르면 관계가 열립니다."}
      </p>
    </main>
  );
}
