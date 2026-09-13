import { useEffect, useMemo, useRef, useState } from 'react';
import { Expand, GitBranch, Maximize2, Minimize2, Network, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [showAll, setShowAll] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeDrag = useRef(null);
  const justDragged = useRef(false);
  const userAdjusted = useRef(false);
  const fitAfterExpand = useRef(false);
  const [frontNodeId, setFrontNodeId] = useState(null);
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

    const direct = members
      .filter(member => (sameGroup(member, group) || assigned.has(member.id)) &&
        !leaderIds.has(member.id) &&
        !leaderNames.has(norm(displayName(member))) &&
        !leaderNames.has(norm(`${member.lastName} ${member.firstName}`)));

    // Del grupo de los martes se desprenden las personas (ej. Natalia,
    // Héctor): los facilitadores de los subgrupos cuelgan de Martes aunque
    // en los datos figuren asignados a sus propios grupos, y de ellos
    // nacen los grupos a su cargo.
    if (!scopeMember && /martes/i.test(group.name || '')) {
      const present = new Set(direct.map(member => member.id));
      leaderIds.forEach(id => present.add(id));
      const extra = [];
      groups.forEach(candidate => {
        if (candidate.id === group.id || rootGroups.some(root => root.id === candidate.id)) return;
        leadersOf(candidate).forEach(leader => {
          if (!byId[leader.id] || present.has(leader.id)) return;
          present.add(leader.id);
          extra.push(byId[leader.id]);
        });
      });
      return [...direct, ...extra].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    }

    return direct.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
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
    // En vista completa ningún grupo queda afuera: los no alcanzables
    // cuelgan directo de la raíz para que todos los nodos se desplieguen.
    if (showAll) {
      groups.forEach(group => {
        if (visibleGroups.has(group.id)) return;
        visibleGroups.add(group.id);
        const orphanId = `group:${group.id}`;
        addNode(orphanId, 'group', group.name, { group });
        addEdge('root', orphanId);
        queue.push(group);
      });
    }
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
      const spacing = Math.max(108, Math.min(160, 720 / Math.max(column.length, 1)));
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

    // Color por grupo: cada grupo tiene un tono propio determinista (vale
    // también para grupos futuros). Cada persona toma el tono del grupo
    // que lidera, o del grupo al que pertenece si no lidera ninguno.
    const hashHue = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h % 360;
    };
    const groupHue = {};
    [...nodeMap.values()].forEach(node => {
      if (node.kind === 'group') groupHue[node.id] = hashHue(node.id);
    });

    const nodes = [...nodeMap.values()].map(node => {
      let hue = 220;
      if (node.kind === 'group') {
        hue = groupHue[node.id];
      } else if (node.kind === 'person') {
        const led = edges.find(e => e.from === node.id && groupHue[e.to] !== undefined);
        const parent = led || edges.find(e => e.to === node.id && groupHue[e.from] !== undefined);
        if (parent) hue = groupHue[parent.to === node.id ? parent.from : parent.to];
      }
      return { ...node, hue, depth: level[node.id] ?? 1 };
    });

    return { nodes, edges, positions, width, height: viewMode === 'pyramid' ? Math.max(760, levelKeys.length * 155 + 130) : 760 };
  }, [groups, members, rootGroups, expanded, viewMode, scopeMember, showAll]);

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

  // Vecindario del nodo seleccionado: ancestros y descendientes.
  // Al pulsar, lo ajeno se atenúa y solo quedan encendidos sus vínculos.
  const lineage = useMemo(() => {
    const nodeIds = new Set();
    const edgeIds = new Set();
    if (!selectedNode) return { nodeIds, edgeIds };
    const incoming = new Map();
    const outgoing = new Map();
    graph.edges.forEach(edge => {
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);
      if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
      incoming.get(edge.to).push(edge);
      outgoing.get(edge.from).push(edge);
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
      (outgoing.get(current) || []).forEach(edge => {
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.to)) pending.push(edge.to);
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
    userAdjusted.current = true;
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
    // El nodo tocado pasa al frente para que el tap no caiga en otro superpuesto.
    setFrontNodeId(nodeId);
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
    // En táctil el dedo tiembla más: umbral mayor para no comerse los taps.
    nodeDrag.current = {
      nodeId,
      movingIds,
      origins,
      x: event.clientX,
      y: event.clientY,
      threshold: event.pointerType === 'touch' ? 20 : 8,
    };
    justDragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveNode = event => {
    if (!nodeDrag.current) return;
    const drag = nodeDrag.current;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > (drag.threshold || 8)) {
      justDragged.current = true;
      userAdjusted.current = true;
    }
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

  // Distancia horizontal mínima entre un nodo y sus subnodos (vista red).
  const GAP_X = 150;

  // Repara el layout para que cada subnodo quede a la derecha de su padre,
  // desplazando en cascada los descendientes que queden a la izquierda.
  const repairPositions = merged => {
    const pos = {};
    Object.entries(merged).forEach(([id, p]) => { pos[id] = { ...p }; });
    const depthOf = {};
    graph.nodes.forEach(n => { depthOf[n.id] = n.depth ?? 1; });
    const order = [...graph.nodes].sort((a, b) => (depthOf[a.id] ?? 1) - (depthOf[b.id] ?? 1));
    for (let pass = 0; pass < graph.nodes.length; pass++) {
      let fixed = false;
      const shifted = new Set();
      order.forEach(node => {
        if (!pos[node.id]) return;
        graph.edges.forEach(edge => {
          if (edge.from !== node.id || !pos[edge.to] || shifted.has(edge.to)) return;
          const minX = pos[node.id].x + GAP_X;
          if (pos[edge.to].x < minX) {
            const dx = minX - pos[edge.to].x;
            const stack = [edge.to];
            while (stack.length) {
              const cur = stack.pop();
              if (shifted.has(cur) || !pos[cur]) continue;
              shifted.add(cur);
              pos[cur] = { ...pos[cur], x: pos[cur].x + dx };
              graph.edges.forEach(e2 => { if (e2.from === cur) stack.push(e2.to); });
            }
            fixed = true;
          }
        });
      });
      if (!fixed) break;
    }
    const next = {};
    Object.entries(pos).forEach(([id, p]) => {
      const base = graph.positions[id];
      if (!base || base.x !== p.x || base.y !== p.y) next[id] = p;
    });
    return next;
  };

  // Separa nodos superpuestos (incluye margen para las etiquetas).
  const decollide = merged => {
    const pos = {};
    Object.entries(merged).forEach(([id, p]) => { pos[id] = { ...p }; });
    const byId = {};
    graph.nodes.forEach(n => { byId[n.id] = n; });
    const effR = id => {
      const n = byId[id];
      if (!n) return 0;
      const base = n.kind === 'root' ? 34 : n.kind === 'group' ? 30 : 23;
      return base + 40;
    };
    const ids = Object.keys(pos).filter(id => byId[id]);
    for (let iter = 0; iter < 40; iter++) {
      let moved = false;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos[ids[i]];
          const b = pos[ids[j]];
          const min = effR(ids[i]) + effR(ids[j]);
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          if (dist >= min) continue;
          if (dist < 1) { dx = min; dy = 0; dist = min; }
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          pos[ids[i]] = { x: a.x - ux * push, y: a.y - uy * push };
          pos[ids[j]] = { x: b.x + ux * push, y: b.y + uy * push };
          moved = true;
        }
      }
      if (!moved) break;
    }
    const next = {};
    Object.entries(pos).forEach(([id, p]) => {
      const base = graph.positions[id];
      if (!base || base.x !== p.x || base.y !== p.y) next[id] = p;
    });
    return next;
  };

  const resolvePositions = merged => (
    viewMode === 'network' ? decollide(repairPositions(merged)) : decollide(merged)
  );

  const stopNodeDrag = event => {
    event.stopPropagation();
    nodeDrag.current = null;
    // Al soltar, los subnodos vuelven a quedar a la derecha de su padre
    // y se separan los que queden superpuestos.
    setManualPositions(previous => resolvePositions({ ...graph.positions, ...previous }));
  };

  // Cada vez que se abren nodos, se separan los que queden superpuestos.
  useEffect(() => {
    setManualPositions(previous => resolvePositions({ ...graph.positions, ...previous }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;
    const onWheel = event => {
      event.preventDefault();
      userAdjusted.current = true;
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

  // En pantallas chicas el gráfico arranca encuadrado; en desktop como antes.
  const fitToScreen = () => {
    const el = viewportRef.current;
    if (!el || el.clientWidth >= 700) return false;
    const s = Math.max(0.2, Math.min(1, (el.clientWidth - 24) / graph.width, (el.clientHeight - 24) / graph.height));
    setTransform({
      x: (el.clientWidth - graph.width * s) / 2,
      y: (el.clientHeight - graph.height * s) / 2,
      scale: s,
    });
    return true;
  };

  useEffect(() => {
    if (!userAdjusted.current) fitToScreen();
    // Solo al montar y al cambiar de vista para no moverle la vista al usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const handleGroupClick = group => {
    // Si venía arrastrando el nodo, el click posterior se ignora.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    selectGroup(group);
  };

  const handleNodeClick = node => {
    // Si venía arrastrando el nodo, el click posterior se ignora.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    if (node.kind === 'group') {
      selectGroup(node.group);
      return;
    }
    // Las personas no se expanden: solo enfocan sus vínculos.
    setSelectedNode(previous => previous === node.id ? null : node.id);
  };

  const reset = () => {
    userAdjusted.current = false;
    fitAfterExpand.current = false;
    setShowAll(false);
    setExpanded(new Set());
    setSelectedNode(null);
    setManualPositions({});
    if (!fitToScreen()) setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Expande todo el grafo y lo encuadra completo en pantalla.
  const expandAll = () => {
    fitAfterExpand.current = true;
    setManualPositions({});
    setShowAll(true);
    setExpanded(new Set(groups.map(g => g.id)));
  };

  useEffect(() => {
    if (!fitAfterExpand.current) return;
    fitAfterExpand.current = false;
    const el = viewportRef.current;
    if (!el) return;
    const s = Math.max(0.15, Math.min(1.2, (el.clientWidth - 24) / graph.width, (el.clientHeight - 24) / graph.height));
    setTransform({
      x: (el.clientWidth - graph.width * s) / 2,
      y: (el.clientHeight - graph.height * s) / 2,
      scale: s,
    });
  }, [graph]);
  const zoom = amount => {
    userAdjusted.current = true;
    setTransform(previous => ({ ...previous, scale: Math.max(0.35, Math.min(2.4, previous.scale + amount)) }));
  };
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
        <button className="chart-canvas-btn" onClick={expandAll} title="Ver gráfico completo desplegado"><Expand size={16} /></button>
        <button className="chart-canvas-btn" onClick={toggleFullscreen} title="Pantalla completa">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        <button className="chart-canvas-btn" onClick={() => zoom(0.2)} title="Acercar"><ZoomIn size={16} /></button>
        <button className="chart-canvas-btn" onClick={() => zoom(-0.2)} title="Alejar"><ZoomOut size={16} /></button>
        <button className="chart-canvas-btn" onClick={reset} title="Reiniciar vista"><RotateCcw size={15} /></button>
      </div>
      <div className="chart-canvas-scene neural-network-scene" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
        <svg className="neural-network-svg" width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="Red neuronal de grupos y personas">
          <defs>
            <linearGradient id="neural-edge" x1="0" x2="1">
              <stop offset="0" stopOpacity=".3" style={{ stopColor: 'var(--color-primary)' }} />
              <stop offset=".5" stopOpacity="1" style={{ stopColor: 'var(--color-primary)' }} />
              <stop offset="1" stopOpacity=".35" style={{ stopColor: 'var(--color-primary)' }} />
            </linearGradient>
            <filter id="neural-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <g className="neural-edges">
            {graph.edges.map(edge => (
              <path
                key={`base-${edge.id}`}
                d={pathFor(edge)}
                className={`neural-edge-base${lineage.edgeIds.has(edge.id) ? ' lineage-highlight' : ''}${selectedNode && !lineage.edgeIds.has(edge.id) ? ' dimmed' : ''}`}
              />
            ))}
            {graph.edges.map(edge => (
              <path
                key={edge.id}
                d={pathFor(edge)}
                className={`neural-edge${lineage.edgeIds.has(edge.id) ? ' lineage-highlight' : ''}${selectedNode && !lineage.edgeIds.has(edge.id) ? ' dimmed' : ''}`}
              />
            ))}
          </g>
          <g className="neural-nodes">
            {[...graph.nodes]
              .sort((a, b) => (a.id === frontNodeId ? 1 : b.id === frontNodeId ? -1 : 0))
              .map(node => {
              const position = positions[node.id];
              const radius = nodeRadius(node);
              const open = node.kind === 'group' && expanded.has(node.group.id);
              const deepGroup = node.kind === 'group' && node.depth >= 4;
              return (
                <g
                  key={node.id}
                  className={`network-node network-node-${node.kind}${node.kind !== 'root' ? ' network-node-clickable' : ''}${lineage.nodeIds.has(node.id) ? ' lineage-highlight' : ''}${selectedNode === node.id ? ' selected-node' : ''}${selectedNode && !lineage.nodeIds.has(node.id) ? ' dimmed' : ''}`}
                  transform={`translate(${position.x} ${position.y})`}
                  style={{ '--branch': node.hue, '--node-l': node.kind === 'person' ? '72%' : deepGroup ? '66%' : '56%' }}
                  onClick={node.kind === 'root' ? undefined : () => handleNodeClick(node)}
                  onPointerDown={event => startNodeDrag(event, node.id)}
                  onPointerMove={moveNode}
                  onPointerUp={stopNodeDrag}
                  onPointerCancel={stopNodeDrag}
                  role={node.kind === 'group' ? 'button' : undefined}
                  aria-expanded={node.kind === 'group' ? open : undefined}
                >
                  {node.kind === 'root' ? (
                    <>
                      <defs>
                        <clipPath id="iea-root-clip">
                          <circle r={radius} />
                        </clipPath>
                      </defs>
                      <circle r={radius + 7} className="network-node-halo" />
                      <circle r={radius} className="network-node-circle" />
                      <image
                        href="/img/icon-500x500.png"
                        x={-radius}
                        y={-radius}
                        width={radius * 2}
                        height={radius * 2}
                        clipPath="url(#iea-root-clip)"
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <circle r={radius} className="network-node-ring" />
                    </>
                  ) : (
                    <>
                      <circle r={radius + 13} fill="transparent" className="network-node-hit" />
                      <circle r={radius + 7} className="network-node-halo" />
                      <circle r={radius} className="network-node-circle" />
                      {selectedNode === node.id && <circle r={radius + 12} className="network-node-selected-ring" />}
                    </>
                  )}
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
