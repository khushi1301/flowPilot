import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { X, LayoutTemplate, Search } from 'lucide-react';
import { useStore } from '../../store';
import { TEMPLATES } from '../../templates';
import { SHORTCUTS } from '../../hooks/useShortcuts';
import { NODE_LIST } from '../../nodes/registry';
import { NODE_W } from '../../engine/graphUtils';
import { exportWorkflow, copyWorkflowJSON } from '../../utils/io';

function Shell({ title, onClose, children, wide }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="btn icon ghost" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

function TemplatesModal({ onClose }) {
  const loadTemplate = useStore((s) => s.loadTemplate);
  const setView = useStore((s) => s.setView);
  return (
    <Shell title="Start from a template" onClose={onClose} wide>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="template" onClick={() => { loadTemplate(t.id); setView('editor'); onClose(); }}>
            <LayoutTemplate size={18} />
            <strong>{t.name}</strong>
            <p>{t.description}</p>
            <small>{t.count} steps</small>
          </button>
        ))}
      </div>
      <p className="modal-note">Loading a template replaces the current workflow. You can undo with Ctrl+Z.</p>
    </Shell>
  );
}

function ShortcutsModal({ onClose }) {
  return (
    <Shell title="Keyboard shortcuts" onClose={onClose}>
      <dl className="shortcuts">
        {SHORTCUTS.map(([label, keys]) => (
          <div key={label}><dt>{label}</dt><dd>{keys.split(' ').map((k, i) => <kbd key={i}>{k}</kbd>)}</dd></div>
        ))}
      </dl>
    </Shell>
  );
}

function CommandPalette({ onClose }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const s = useStore.getState();

  const commands = useMemo(() => {
    const addAt = (kind) => () => {
      const r = document.querySelector('.fp-canvas')?.getBoundingClientRect();
      const p = r ? screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 0, y: 0 };
      s.setView('editor');
      s.addNode(kind, { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - 30) });
    };
    return [
      { label: 'Run workflow', run: () => s.startRun() },
      { label: 'Run one step at a time', run: () => s.stepRun() },
      { label: 'Stop run', run: () => s.stopRun() },
      { label: 'Undo', run: () => s.undo() },
      { label: 'Redo', run: () => s.redo() },
      { label: 'Tidy up layout', run: () => s.autoLayout() },
      { label: 'Fit to screen', run: () => fitView({ duration: 300, padding: 0.2 }) },
      { label: 'Go to execution history', run: () => s.setView('history') },
      { label: 'Go to editor', run: () => s.setView('editor') },
      { label: 'Browse templates', run: () => s.openModal('templates'), keep: true },
      { label: 'Export workflow as JSON file', run: exportWorkflow },
      { label: 'Copy workflow as JSON', run: copyWorkflowJSON },
      ...NODE_LIST.map((n) => ({ label: `Add ${n.label.toLowerCase()} step`, run: addAt(n.kind) })),
    ];
  }, [s, screenToFlowPosition, fitView]);

  const list = commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())).slice(0, 9);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => setIdx(0), [q]);

  const exec = (c) => { if (!c) return; if (!c.keep) onClose(); c.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') exec(list[idx]);
  };

  return (
    <div className="modal-backdrop top" onMouseDown={onClose}>
      <div className="modal palette" role="dialog" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <label className="search big"><Search size={16} /><input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Type a command or step name" /></label>
        <ul>
          {list.map((c, i) => (
            <li key={c.label}><button className={i === idx ? 'active' : ''} onMouseEnter={() => setIdx(i)} onClick={() => exec(c)}>{c.label}</button></li>
          ))}
          {list.length === 0 && <li className="none">No commands match "{q}"</li>}
        </ul>
      </div>
    </div>
  );
}

export default function Modals() {
  const modal = useStore((s) => s.modal);
  const close = useStore((s) => s.closeModal);
  if (modal === 'templates') return <TemplatesModal onClose={close} />;
  if (modal === 'shortcuts') return <ShortcutsModal onClose={close} />;
  if (modal === 'palette') return <CommandPalette onClose={close} />;
  return null;
}
