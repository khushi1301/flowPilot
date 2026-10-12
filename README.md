# FlowPilot

**Build and run automations visually.**

FlowPilot is a visual workflow automation builder. Drag steps onto a canvas, connect them, configure each one in a side panel, check the workflow for mistakes, and run it in a built-in simulator. Think of a flowchart that can actually run.

---

## Why I built this

Automation tools like Zapier and n8n are built on a graph editor, and building one touches many hard frontend problems at once: drag-and-connect interaction, undo/redo, validation, and a run engine that is kept separate from the UI. I built FlowPilot to practice those problems in one project.

## Features

**Editor**
- 12 step types across six categories: Webhook, Schedule, Manual, API call, Send email, Set variable, Condition, Loop, Delay, Approval, Success and Fail
- Drag steps from the palette, or click to add them
- Side panel with a configuration form for the selected step
- Minimap, zoom controls, snap-to-grid and automatic layout ("Tidy up")
- Copy, paste, duplicate and multi-select

**Reliability**
- Undo and redo (up to 50 steps), with rapid typing merged into a single undo step
- Autosave to the browser 800 ms after your last change
- Live validation: broken steps get a red dashed outline and the Issues tab lists every problem. Click one to jump straight to the step

**Simulation**
- Run, pause, step one node at a time, and stop
- Speed control at 1×, 2× and 5×
- Approval steps pause the run and ask for a decision
- API calls with retries and a configurable failure rate
- Loops and `{{variables}}` that pass data between steps
- The path taken is highlighted, and every run writes a log

**Extras**
- Three ready-made templates: Order approval, Lead follow-up, Incident alert
- Execution history dashboard with success rate, average duration and a duration chart
- Import and export workflows as JSON
- Command palette (`Ctrl+K`) and keyboard shortcuts

## Tech stack

| Area | Choice |
|---|---|
| UI | React 18, JavaScript |
| Canvas | React Flow (`@xyflow/react`) |
| State | Zustand, split into slices |
| Layout | dagre |
| Icons | lucide-react |
| Build | Vite |
| Storage | `localStorage`, no backend |

## Getting started

You need Node.js 18 or newer.

```bash
git clone https://github.com/khushi1301/flowPilot.git
cd flowpilot
npm install
npm run dev
```

Open http://localhost:5173.

```bash
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## Try it: a refund approval workflow

1. Click **New** to start with an empty canvas.
2. Drag in a **Manual** trigger and set its input data to:
   ```json
   { "customer": "Riya Sharma", "email": "riya@example.com", "amount": 4500 }
   ```
3. Add a **Condition** with the expression `vars.amount > 2000`.
4. Connect **True** to an **Approval** step and **False** to a **Success** step.
5. After **Approved**, add an **API call** and a **Send email** step. After **Rejected**, add a **Fail** step.
6. Press **Run** (or `Space`). When the Approval step pauses, click **Approve**.

Change `4500` to `800` and run it again to watch the other branch.

## Variables and conditions

- Fields from a trigger's payload become variables. Use them in any text field with double braces, for example `{{customer}}` or `{{amount}}`.
- API calls save their response under the name you choose in **Save response as**.
- Conditions are plain JavaScript on `vars`, for example `vars.amount > 1000` or `vars.response.ok === true`.
- Inside a Loop, the current round number is available as `{{index}}`.

## Validation rules

FlowPilot flags a workflow as broken when:

- It has no trigger, or more than one
- A step is not reachable from the trigger
- A Condition, Loop or Approval has an unconnected output
- A path ends without a Success or Fail step
- The graph contains a cycle (use a Loop step to repeat instead)
- A required field is empty or invalid, such as a bad URL, cron expression or JSON payload

The Run button refuses to start while errors remain.

## Keyboard shortcuts

| Action | Keys |
|---|---|
| Undo / Redo | `Ctrl Z` / `Ctrl Shift Z` |
| Save now | `Ctrl S` |
| Copy / Paste | `Ctrl C` / `Ctrl V` |
| Duplicate | `Ctrl D` |
| Select all | `Ctrl A` |
| Delete selection | `Delete` |
| Run / Pause | `Space` |
| Fit to screen | `F` |
| Command palette | `Ctrl K` |
| Show shortcuts | `?` |

On macOS, use `Cmd` instead of `Ctrl`.

## How it works

```
src/
├── nodes/
│   └── registry.js        One object per step type: look, form, validation, behavior
├── engine/
│   ├── validate.js        Pure function: graph in, list of issues out
│   ├── simulate.js        Run engine; talks to the UI only through hooks
│   └── graphUtils.js      Layout (dagre), edge helpers, reachability
├── store/                 Zustand slices
│   ├── graphSlice.js      Nodes, edges, copy/paste, templates
│   ├── historySlice.js    Undo and redo
│   ├── uiSlice.js         Panels, modals, save state
│   ├── validationSlice.js Current issues
│   └── runSlice.js        Run status, logs, history
├── hooks/                 useAutosave, useValidation, useShortcuts
├── components/            canvas, panels, toolbar, history, ui
└── templates/             Ready-made workflows
```

### Design decisions

**A node registry instead of one component per step.** Every step type is a single object that describes its icon, config fields, validation and simulated behavior. The palette, side panel, validator and simulator all read from it, so adding a step type never means touching those files.

**A simulation engine with no React in it.** `simulate.js` reports progress through a small set of callbacks (`onNode`, `onEdge`, `onLog`, and so on). It can be tested without a browser, and the UI can be swapped without touching the engine.

**Undo by snapshotting before a change.** `commit()` saves the graph just before an edit. Dragging commits once when the drag starts, and typing in a field uses a key so a burst of keystrokes becomes one undo step.

**Validation as a pure function.** `validate(nodes, edges)` returns a list of issues. The canvas, the Issues tab, the side panel and the Run button all use the same result.

**One connection per output.** Each output handle accepts only one line, which keeps execution order clear and the simulator simple.

### Add a new step type

Add one entry to `src/nodes/registry.js`:

```js
define('slack', {
  label: 'Send Slack message',
  category: 'action',
  icon: MessageSquare,
  description: 'Post a message to a channel',
  defaults: { channel: '#general', text: 'Hello {{customer}}' },
  fields: [
    { key: 'channel', label: 'Channel', type: 'text', required: true },
    { key: 'text', label: 'Message', type: 'textarea', rows: 4 },
  ],
  summary: (c) => c.channel,
  execute: async (c, ctx, h) => {
    await h.sleep(400);
    h.log('info', `Posted to ${c.channel}`);
    return { output: { sent: true } };
  },
});
```

It then appears in the palette and side panel, gets validated, and runs in the simulator.

## A note on the simulator

FlowPilot runs entirely in the browser. When you press Run, **no real emails are sent and no real API calls are made**. Each step pretends to run so you can test the logic of a workflow safely. Connecting it to a real backend that executes steps is the natural next step (see the roadmap).

## Roadmap

- [ ] Variable picker: type `{{` to choose from earlier step outputs
- [ ] Version history with named snapshots and restore
- [ ] Parallel branches and a merge step
- [ ] Sticky notes and step grouping
- [ ] Switch step with multiple cases
- [ ] Backend that executes real workflows
- [ ] Light theme and full keyboard navigation of the canvas
- [ ] Unit tests for the validator and simulation engine

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push the branch and open a pull request

## Author

**Khushi Gupta**
[LinkedIn](https://www.linkedin.com/in/khushi-gupta-1384bb21a/) · [GitHub](https://github.com/khushi1301)

If you found this project useful, a star on the repo is appreciated.
