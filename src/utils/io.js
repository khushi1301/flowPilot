import { useStore } from '../store';
import { NODE_DEFS } from '../nodes/registry';

const snapshot = () => {
  const { workflowName, nodes, edges } = useStore.getState();
  return {
    format: 'flowpilot/1',
    name: workflowName,
    nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: edges.map(({ selected, ...e }) => e),
  };
};

export function exportWorkflow() {
  const data = snapshot();
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.name || 'workflow').replace(/\s+/g, '-').toLowerCase()}.flowpilot.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const copyWorkflowJSON = () => navigator.clipboard?.writeText(JSON.stringify(snapshot(), null, 2));

/** Returns an error message, or null on success. */
export async function importWorkflow(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return 'This file is not a FlowPilot workflow.';
    if (data.nodes.some((n) => !NODE_DEFS[n.data?.kind])) return 'This workflow uses step types FlowPilot does not know.';
    useStore.getState().loadWorkflow({ name: data.name, nodes: data.nodes.map((n) => ({ ...n, type: 'flowNode' })), edges: data.edges });
    return null;
  } catch {
    return 'Could not read this file. Check that it is valid JSON.';
  }
}
