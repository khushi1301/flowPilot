import { useState } from 'react';
import { Search, LayoutTemplate } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { CATEGORIES, NODE_LIST } from '../../nodes/registry';
import { TEMPLATES } from '../../templates';
import { useStore } from '../../store';
import { NODE_W } from '../../engine/graphUtils';

export default function Palette() {
  const [q, setQ] = useState('');
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useStore((s) => s.addNode);
  const loadTemplate = useStore((s) => s.loadTemplate);

  const addAtCenter = (kind) => {
    const r = document.querySelector('.fp-canvas').getBoundingClientRect();
    const jitter = () => (Math.random() - 0.5) * 80;
    const p = screenToFlowPosition({ x: r.left + r.width / 2 + jitter(), y: r.top + r.height / 2 + jitter() });
    addNode(kind, { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - 30) });
  };

  const match = (n) => `${n.label} ${n.description}`.toLowerCase().includes(q.toLowerCase());

  return (
    <aside className="fp-panel fp-palette">
      <div className="panel-title">Nodes</div>
      <label className="search"><Search size={14} /><input placeholder="Search nodes" value={q} onChange={(e) => setQ(e.target.value)} /></label>

      <div className="palette-scroll">
        {Object.entries(CATEGORIES).map(([cat, meta]) => {
          const items = NODE_LIST.filter((n) => n.category === cat && match(n));
          if (!items.length) return null;
          return (
            <section key={cat}>
              <h4><i style={{ background: meta.color }} />{meta.label}</h4>
              {items.map((n) => (
                <button
                  key={n.kind}
                  className="palette-item"
                  style={{ '--c': meta.color }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('application/flowpilot', n.kind); e.dataTransfer.effectAllowed = 'move'; }}
                  onClick={() => addAtCenter(n.kind)}
                  title="Drag onto the canvas, or click to add"
                >
                  <span className="ico"><n.icon size={15} /></span>
                  <span><strong>{n.label}</strong><small>{n.description}</small></span>
                </button>
              ))}
            </section>
          );
        })}

        {!q && (
          <section>
            <h4><i style={{ background: '#6b6b78' }} />Templates</h4>
            {TEMPLATES.map((t) => (
              <button key={t.id} className="palette-item" style={{ '--c': '#6b6b78' }} onClick={() => loadTemplate(t.id)}>
                <span className="ico"><LayoutTemplate size={15} /></span>
                <span><strong>{t.name}</strong><small>{t.count} steps</small></span>
              </button>
            ))}
          </section>
        )}
      </div>
    </aside>
  );
}
