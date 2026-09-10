import { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, Maximize2, Minimize2, Network, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import './MinistryChart.css';

const asArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return value.split(',').map(item => item.trim());
  return [];
};

const norm = value => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[,.;]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const displayName = member => `${member.firstName || ''} ${member.lastName || ''}`.trim();

export default function MinistryChart({ groups = [], members = [], scopeMember = null }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [manualPositions, setManualPositions] = useState({});
  const [viewMode, setViewMode] = useState('network');
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeDrag = useRef(null);
  const viewportRef = useRef(null);

  const byId = useMemo(() => Object.fromEntries(members.map(member => [member.id, member])), [members]);
  const byName = useMemo(() => {
    const map = {};
    members.forEach(member => {
      map[norm(displayName(member))] = member;
      map[norm(`${member.lastName} ${member.firstName}`)] = member;
    });
    return map;
  }, [members]);

  const resolveMember = value => {
    if (byId[value]) return byId[value];
    if (byName[norm(value)]) return byName[norm(value)];
    const tokens = norm(value).split(' ').filter(Boolean);
    if (tokens.length < 2) return null;
    return members.find(member => {
      const first = norm(member.firstName);
      const last = norm(member.lastName);
      return tokens.some(token => token === first) && tokens.some(token => token.length > 2 && (last.startsWith(token) || token.startsWith(last)));
    }) || null;
  };

  const leadersOf = group => [...asArray(group.facilitators), ...asArray(group.coFacilitators)]
    .map(resolveMember)
    .filter(Boolean)
    .filter((member, index, list) => list.findIndex(item => item.id === member.id) === index);

  const sameGroup = (member, group) => {
    const memberGroup = norm(member.group);
    const groupName = norm(group.name);
    return Boolean(memberGroup && groupName && (
      memberGroup === groupName ||
      groupName.includes(memberGroup) ||
      memberGroup.includes(groupName) ||
      (group.scheduleDay && memberGroup === norm(group.scheduleDay) && groupName.includes(norm(group.scheduleDay)))
    ));
  };

  const membersOf = group => {
    const leaders = leadersOf(group);
    const leaderIds = new Set(leaders.map(member => member.id));
    const leaderNames = new Set(leaders.flatMap(member => [norm(displayName(member)), norm(`${member.lastName} ${member.firstName}`)]));
    const assigned = new Set([
      ...asArray(group.initialMemberIds),
      ...asArray(group.memberIds),
      ...asArray(group.members),
    ].map(value => resolveMember(value)?.id || value));

    return members
      .filter(member => (sameGroup(member, group) || assigned.has(member.id)) &&
        !leaderIds.has(member.id) &&
        !leaderNames.has(norm(displayName(member))) &&
        !leaderNames.has(norm(`${member.lastName} ${member.firstName}`)))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  };

  const rootGroups = useMemo(() => {
    if (scopeMember) {
      return groups.filter(group => leadersOf(group).some(leader => leader.id === scopeMember.id));
    }
    const roots = groups.filter(group => /martes|jueves/i.test(group.name || '')).slice(0, 2);
    return roots.length ? roots : groups.slice(0, 2);
  }, [groups, scopeMember]);

  const childGroupsOf = group => {
    const parentMembers = membersOf(group);
    return groups.filter(candidate => {
      if (candidate.id === group.id || rootGroups.some(root => root.id === candidate.id)) return false;
      return leadersOf(candidate).some(leader => parentMembers.some(member => member.id === leader.id));
    });
  };

  const graph = useMemo(() => {
    const nodeMap = new Map();
    const edgeMap = new Map();
    const addNode = (id, kind, label, data = {}) => {
      if (!nodeMap.has(id)) nodeMap.set(id, { id, kind, label, ...data });
    };
    const addEdge = (from, to) => {
      const key = `${from}->${to}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { id: key, from, to });
    };

    addNode('root', 'root', scopeMember ? displayName(scopeMember) : 'Pastores');
    rootGroups.forEach(root => {
      const rootId = `group:${root.id}`;
      addNode(rootId, 'group', root.name, { group: root });
      addEdge('root', rootId);
    });

    const visibleGroups = new Set(rootGroups.map(group => group.id));
    const queue = [...rootGroups];
    while (queue.length) {
      const parent = queue.shift();
      if (!expanded.has(parent.id)) continue;

      const parentId = `group:${parent.id}`;
      membersOf(parent).forEach(member => {
        const personId = `person:${member.id}`;
        addNode(personId, 'person', displayName(member), { member });
        addEdge(parentId, personId);
      });

      childGroupsOf(parent).forEach(child => {
        if (!visibleGroups.has(child.id)) {
          visibleGroups.add(child.id);
          queue.push(child);
        }
        const childId = `group:${child.id}`;
        addNode(childId, 'group', child.name, { group: child });
        leadersOf(child).forEach(leader => {
          const personId = `person:${leader.id}`;
          addNode(personId, 'person', displayName(leader), { member: leader });
          addEdge(personId, childId);
        });
      });
    }

    const edges = [...edgeMap.values()];
    const level = { root: 0 };
    let changed = true;
    while (changed) {
      changed = false;
      edges.forEach(edge => {
        if (level[edge.from] !== undefined && level[edge.to] === undefined) {
          level[edge.to] = level[edge.from] + 1;
          changed = true;
        }
      });
    }

    const levels = {};
    [...nodeMap.values()].forEach(node => {
      const nodeLevel = level[node.id] ?? 1;
      if (!levels[nodeLevel]) levels[nodeLevel] = [];
      levels[nodeLevel].push(node);
    });

    // Agrupa visualmente las personas que convergen en el mismo grupo. Esto
    // reduce cruces: Micaela/Misael, Sebastián/Abigail, etc. quedan juntos.
    const outgoing = new Map();
    const incoming = new Map();
    edges.forEach(edge => {
      if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);
      outgoing.get(edge.from).push(edge.to);
      incoming.get(edge.to).push(edge.from);
    });
    Object.values(levels).forEach(column => {
      column.sort((a, b) => {
        const aTargets = (outgoing.get(a.id) || []).sort().join('|');
        const bTargets = (outgoing.get(b.id) || []).sort().join('|');
        const aSources = (incoming.get(a.id) || []).sort().join('|');
        const bSources = (incoming.get(b.id) || []).sort().join('|');
        const aKey = aTargets || `z-${aSources}`;
        const bKey = bTargets || `z-${bSources}`;
        return aKey.localeCompare(bKey);
      });
    });

    const positions = {};
    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
    const maxColumn = Math.max(...levelKeys.map(levelNumber => levels[levelNumber].length), 1);
    const width = viewMode === 'pyramid'
      ? Math.max(1200, maxColumn * 190 + 260)
      : Math.max(1100, (levelKeys.length + 1) * 270);
    levelKeys.forEach(levelNumber => {
      const column = levels[levelNumber];
      const spacing = Math.max(92, Math.min(145, 650 / Math.max(column.length, 1)));
      column.forEach((node, index) => {
        const centeredIndex = index - (column.length - 1) / 2;
        positions[node.id] = viewMode === 'pyramid'
          ? {
              x: width / 2 + centeredIndex * Math.max(150, 210 - levelNumber * 12),
              y: 90 + levelNumber * 155,
            }
          : {
              x: 110 + levelNumber * 245 + Math.abs(centeredIndex) * levelNumber * 13,
              y: 380 + centeredIndex * spacing,
            };
      });
    });

    return { nodes: [...nodeMap.values()], edges, positions, width, height: viewMode === 'pyramid' ? Math.max(760, levelKeys.length * 155 + 130) : 760 };
  }, [groups, members, rootGroups, expanded, viewMode, scopeMember]);

  useEffect(() => {
    setManualPositions({});
  }, [viewMode]);

  useEffect(() => {
    const validIds = new Set(graph.nodes.map(node => node.id));
    setManualPositions(previous => Object.fromEntries(
      Object.entries(previous).filter(([id]) => validIds.has(id))
    ));
  }, [graph.nodes]);

  const positions = useMemo(() => ({ ...graph.positions, ...manualPositions }), [graph.positions, manualPositions]);

  const lineage = useMemo(() => {
    const nodeIds = new Set();
    const edgeIds = new Set();
    if (!selectedNode) return { nodeIds, edgeIds };
    const incoming = new Map();
    graph.edges.forEach(edge => {
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);
      incoming.get(edge.to).push(edge);
    });
    const pending = [selectedNode];
    while (pending.length) {
      const current = pending.shift();
      if (nodeIds.has(current)) continue;
      nodeIds.add(current);
      (incoming.get(current) || []).forEach(edge => {
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.from)) pending.push(edge.from);
      });
    }
    return { nodeIds, edgeIds };
  }, [graph, selectedNode]);

  const toggle = id => setExpanded(previous => {
    const next = new Set(previous);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectGroup = group => {
    const nodeId = `group:${group.id}`;
    setSelectedNode(previous => previous === nodeId ? null : nodeId);
    toggle(group.id);
  };

  const pointerDown = event => {
    if (event.target.closest('.network-node') || event.target.closest('button')) return;
    setDragging(true);
    dragStart.current = { x: event.clientX - transform.x, y: event.clientY - transform.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = event => {
    if (!dragging) return;
    setTransform(previous => ({ ...previous, x: event.clientX - dragStart.current.x, y: event.clientY - dragStart.current.y }));
  };
  const stopDragging = () => setDragging(false);

  const startNodeDrag = (event, nodeId) => {
    event.stopPropagation();
    const current = positions[nodeId];
    const descendants = new Set();
    const pending = [nodeId];
    while (pending.length) {
      const currentId = pending.shift();
      graph.edges.forEach(edge => {
        if (edge.from === currentId && !descendants.has(edge.to)) {
          descendants.add(edge.to);
          pending.push(edge.to);
        }
      });
    }
    const movingIds = [nodeId, ...descendants];
    const origins = Object.fromEntries(movingIds.map(id => [id, positions[id]]));
    nodeDrag.current = { nodeId, movingIds, origins, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveNode = event => {
    if (!nodeDrag.current) return;
    const drag = nodeDrag.current;
    const scale = transform.scale || 1;
    const dx = (event.clientX - drag.x) / scale;
    const dy = (event.clientY - drag.y) / scale;
    setManualPositions(previous => {
      const next = { ...previous };
      drag.movingIds.forEach(id => {
        const origin = drag.origins[id];
        if (origin) next[id] = { x: origin.x + dx, y: origin.y + dy };
      });
      return next;
    });
  };

  const stopNodeDrag = event => {
    event.stopPropagation();
    nodeDrag.current = null;
  };

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;
    const onWheel = event => {
      event.preventDefault();
      setTransform(previous => ({ ...previous, scale: Math.max(0.35, Math.min(2.4, previous.scale + (event.deltaY < 0 ? 0.1 : -0.1))) }));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  const nodeRadius = node => node.kind === 'root' ? 34 : node.kind === 'group' ? 30 : 23;
  const pathFor = edge => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) return '';
    const startX = from.x + nodeRadius(graph.nodes.find(node => node.id === edge.from));
    const endX = to.x - nodeRadius(graph.nodes.find(node => node.id === edge.to));
    const bend = Math.max(55, (endX - startX) * 0.45);
    return `M ${startX} ${from.y} C ${startX + bend} ${from.y}, ${endX - bend} ${to.y}, ${endX} ${to.y}`;
  };

  const reset = () => setTransform({ x: 0, y: 0, scale: 1 });
  const zoom = amount => setTransform(previous => ({ ...previous, scale: Math.max(0.35, Math.min(2.4, previous.scale + amount)) }));
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else viewportRef.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={viewportRef}
      className={`chart-canvas-viewport neural-network-viewport${fullscreen ? ' fullscreen' : ''}`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
    >
      <div className="chart-canvas-hint">Arrastra para moverte · Rueda para zoom · Pulsa grupos para abrir</div>
      <div className="chart-canvas-controls">
        <button className={`chart-canvas-view-btn${viewMode === 'network' ? ' active' : ''}`} onClick={() => setViewMode('network')} title="Vista red neuronal">
          <Network size={15} /> Red
        </button>
        <button className={`chart-canvas-view-btn${viewMode === 'pyramid' ? ' active' : ''}`} onClick={() => setViewMode('pyramid')} title="Vista pirámide arriba-abajo">
          <GitBranch size={15} /> Pirámide
        </button>
        <button className="chart-canvas-btn" onClick={toggleFullscreen} title="Pantalla completa">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        <button className="chart-canvas-btn" onClick={() => zoom(0.2)} title="Acercar"><ZoomIn size={16} /></button>
        <button className="chart-canvas-btn" onClick={() => zoom(-0.2)} title="Alejar"><ZoomOut size={16} /></button>
        <button className="chart-canvas-btn" onClick={reset} title="Reiniciar vista"><RotateCcw size={15} /></button>
      </div>
      <div className="chart-canvas-scene neural-network-scene" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
        <svg className="neural-network-svg" width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="Red neuronal de grupos y personas">
          <defs>
            <linearGradient id="neural-edge" x1="0" x2="1">
              <stop offset="0" stopColor="var(--color-primary)" stopOpacity=".3" />
              <stop offset=".5" stopColor="var(--color-primary)" stopOpacity="1" />
              <stop offset="1" stopColor="var(--color-primary)" stopOpacity=".35" />
            </linearGradient>
            <filter id="neural-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <g className="neural-edges">
            {graph.edges.map(edge => (
              <path
                key={edge.id}
                d={pathFor(edge)}
                className={`neural-edge${lineage.edgeIds.has(edge.id) ? ' lineage-highlight' : ''}`}
              />
            ))}
          </g>
          <g className="neural-nodes">
            {graph.nodes.map(node => {
              const position = positions[node.id];
              const radius = nodeRadius(node);
              const open = node.kind === 'group' && expanded.has(node.group.id);
              return (
                <g
                  key={node.id}
                  className={`network-node network-node-${node.kind}${node.kind === 'group' ? ' network-node-clickable' : ''}${lineage.nodeIds.has(node.id) ? ' lineage-highlight' : ''}`}
                  transform={`translate(${position.x} ${position.y})`}
                  onClick={node.kind === 'group' ? () => selectGroup(node.group) : undefined}
                  onPointerDown={event => startNodeDrag(event, node.id)}
                  onPointerMove={moveNode}
                  onPointerUp={stopNodeDrag}
                  onPointerCancel={stopNodeDrag}
                  role={node.kind === 'group' ? 'button' : undefined}
                  aria-expanded={node.kind === 'group' ? open : undefined}
                >
                  <circle r={radius + 7} className="network-node-halo" />
                  <circle r={radius} className="network-node-circle" />
                  <text x={radius + 14} y="5" className="network-node-label">{node.label}</text>
                  {node.kind === 'group' && <text x={radius + 14} y="24" className="network-node-sub">{node.group.type || 'Grupo'}</text>}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
