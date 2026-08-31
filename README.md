# ⚡ Systo

> Composable reactive state systems for fluid UIs and stateful AI agents.

[![npm version](https://img.shields.io/npm/v/systo/alpha.svg)](https://www.npmjs.com/package/systo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> ⚠️ **Status: Active Alpha / Experimental**  
> APIs are actively evolving. Breaking changes may occur during alpha iterations.

## 📦 Installation

```bash
npm install systo@alpha
# or
pnpm add systo@alpha
```

## 🚀 Quick Example

```typescript
import { pipe, scan, view } from 'systo';

// 1. Core State Graph (e.g. Agent Memory / Conversation History)
const agentSystem = scan({
  initialState: { messages: [], status: 'idle' },
  reduce: (state, event) => {
    switch (event.type) {
      case 'PROMPT':
        return { ...state, messages: [...state.messages, { role: 'user', content: event.text }], status: 'thinking' };
      case 'RESPONSE':
        return { ...state, messages: [...state.messages, { role: 'assistant', content: event.text }], status: 'idle' };
      default:
        return state;
    }
  },
});

// 2. Observe and Dispatch
const store = agentSystem.observe({
  next: (state) => console.log('State changed:', state),
});

store.dispatch({ type: 'PROMPT', text: 'Hello!' });
```

## 🧩 Core Primitives

- **`scan`**: Accumulates events into a state graph with pure reducers.
- **`view`**: Local projection, sub-agent scoping, token buffering, and event mapping.
- **`share`**: Multicasts an upstream store to multiple subscribers with lifecycle management.
- **`on`**: Observability and lifecycle hooks (`init`, `next`, `dispatch`, `dispose`).
- **`pipe`**: Pipeline operator composition.

## 📄 License

MIT © 2026