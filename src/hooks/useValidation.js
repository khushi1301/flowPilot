import { useEffect } from 'react';
import { useStore } from '../store';
import { validate } from '../engine/validate';

/** Re-validates the graph 250ms after it changes. */
export function useValidation() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setIssues = useStore((s) => s.setIssues);
  useEffect(() => {
    const t = setTimeout(() => setIssues(validate(nodes, edges)), 250);
    return () => clearTimeout(t);
  }, [nodes, edges, setIssues]);
}
