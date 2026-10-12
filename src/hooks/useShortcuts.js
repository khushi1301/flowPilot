import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../store';

export const SHORTCUTS = [
  ['Undo', 'Ctrl Z'], ['Redo', 'Ctrl Shift Z'], ['Save now', 'Ctrl S'],
  ['Duplicate selection', 'Ctrl D'], ['Copy / paste', 'Ctrl C / Ctrl V'], ['Select all', 'Ctrl A'],
  ['Delete selection', 'Delete'], ['Run / pause', 'Space'], ['Fit to screen', 'F'],
  ['Command palette', 'Ctrl K'], ['Show shortcuts', '?'], ['Close dialog', 'Esc'],
];

export function useShortcuts() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const onKey = (e) => {
      const s = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;

      if (mod && k === 's') { e.preventDefault(); s.saveNow(); return; }
      if (mod && k === 'k') { e.preventDefault(); s.openModal(s.modal === 'palette' ? null : 'palette'); return; }
      if (k === 'escape') { s.closeModal(); return; }
      if (typing || s.view !== 'editor') return;

      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); }
      else if (mod && k === 'y') { e.preventDefault(); s.redo(); }
      else if (mod && k === 'd') { e.preventDefault(); s.duplicate(); }
      else if (mod && k === 'c') s.copySelection();
      else if (mod && k === 'v') s.paste();
      else if (mod && k === 'a') { e.preventDefault(); s.selectAll(); }
      else if (!mod && k === ' ') { e.preventDefault(); s.toggleRun(); }
      else if (!mod && k === 'f') fitView({ duration: 300, padding: 0.2 });
      else if (e.key === '?') s.openModal('shortcuts');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitView]);
}
