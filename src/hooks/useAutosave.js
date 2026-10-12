import { useEffect } from 'react';
import { useStore } from '../store';

/** Saves the workflow 800ms after the last meaningful change. */
export function useAutosave() {
  useEffect(() => {
    let timer;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.workflowName === prev.workflowName) return;
      useStore.setState({ saveState: 'saving' });
      clearTimeout(timer);
      timer = setTimeout(() => useStore.getState().saveNow(), 800);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, []);
}
