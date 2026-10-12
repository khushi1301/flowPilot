import { useCallback, useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react';
import { useStore } from '../../store';
import { NODE_DEFS, nodeColor } from '../../nodes/registry';
import { NODE_W } from '../../engine/graphUtils';
import FlowNode from './FlowNode';
import RunBar from './RunBar';
import { LayoutTemplate, MousePointerClick } from 'lucide-react';

const nodeTypes = { flowNode: FlowNode };

export default function FlowCanvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const issues = useStore((s) => s.issues);
  const taken = useStore((s) => s.takenEdges);
  const running = useStore((s) => s.runStatus === 'running');
  const { onNodesChange, onEdgesChange, onConnect, addNode, commit, openModal } = useStore.getState();
  const { screenToFlowPosition } = useReactFlow();

  // Decorate edges with validation + run state without touching the stored graph
  const shownEdges = useMemo(() => {
    const bad = new Set(issues.filter((i) => i.edgeId).map((i) => i.edgeId));
    return edges.map((e) => ({
      ...e,
      className: [bad.has(e.id) && 'edge-error', taken[e.id] && 'edge-taken'].filter(Boolean).join(' '),
      animated: running && !!taken[e.id],
    }));
  }, [edges, issues, taken, running]);

  const isValidConnection = useCallback((c) => {
    if (c.source === c.target) return false;
    const { nodes: ns, edges: es } = useStore.getState();
    const handle = c.sourceHandle ?? 'out';
    if (es.some((e) => e.source === c.source && (e.sourceHandle ?? 'out') === handle)) return false; // one line per output
    const target = ns.find((n) => n.id === c.target);
    return !!target && NODE_DEFS[target.data.kind].inputs;
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/flowpilot');
    if (!kind || !NODE_DEFS[kind]) return;
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(kind, { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - 30) });
  };

  return (
    <div className="fp-canvas" onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}>
      <div className="fp-canvas-inner">
        <ReactFlow
          nodes={nodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeDragStart={() => commit()}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.8}
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={['Delete', 'Backspace']}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#2a2a33" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(n) => nodeColor(n.data.kind)} maskColor="rgba(8,8,10,.7)" />
          <Panel position="top-center"><RunBar /></Panel>
          {nodes.length === 0 && (
            <Panel position="top-center" className="fp-empty">
              <MousePointerClick size={22} />
              <h3>Start with a trigger</h3>
              <p>Drag a node from the left, or begin from a ready-made workflow.</p>
              <button className="btn primary" onClick={() => openModal('templates')}><LayoutTemplate size={14} /> Browse templates</button>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
